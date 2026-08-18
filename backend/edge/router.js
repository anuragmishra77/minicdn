const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = Number(process.env.PORT) || 7000;

const EDGE_SERVERS = {
    delhi: process.env.EDGE_DELHI_URL || "http://localhost:4000",
    pune: process.env.EDGE_PUNE_URL || "http://localhost:5000",
    london: process.env.EDGE_LONDON_URL || "http://localhost:6000"
};

const edgeStatus = {};
const history = [];
const MAX_HISTORY = 60;

async function updateEdgeStatus() {
    for (const name in EDGE_SERVERS) {
        const url = EDGE_SERVERS[name];
        const startTime = Date.now();

        try {
            await axios.get(`${url}/health`);
            const latency = Date.now() - startTime;

            edgeStatus[name] = {
                latency,
                healthy: true
            };

            console.log(`${name}: ${latency} ms`);
        } catch (error) {
            edgeStatus[name] = {
                latency: Infinity,
                healthy: false
            };

            console.log(`${name}: UNHEALTHY`);
        }
    }

    console.log("Current Edge Status:");
    console.log(edgeStatus);
}

function getHealthyEdges() {
    const healthyEdges = [];

    for (const name in edgeStatus) {
        const status = edgeStatus[name];

        if (status.healthy === false) {
            continue;
        }

        healthyEdges.push({
            name,
            url: EDGE_SERVERS[name],
            latency: status.latency
        });
    }

    healthyEdges.sort((a, b) => a.latency - b.latency);
    return healthyEdges;
}

async function collectStatsHistory() {
    let totalRequests = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    let totalCacheEvictions = 0;

    for (const name in EDGE_SERVERS) {
        try {
            const response = await axios.get(`${EDGE_SERVERS[name]}/stats`);
            const stats = response.data;

            totalRequests += stats.requests;
            totalCacheHits += stats.cacheHits;
            totalCacheMisses += stats.cacheMisses;
            totalCacheEvictions += stats.cacheEvictions;
        } catch (error) {
            console.log(`Could not collect stats from ${name}`);
        }
    }

    const cacheHitRate = totalRequests > 0
        ? (totalCacheHits / totalRequests) * 100
        : 0;

    const snapshot = {
        time: new Date().toLocaleTimeString(),
        requests: totalRequests,
        cacheHits: totalCacheHits,
        cacheMisses: totalCacheMisses,
        cacheEvictions: totalCacheEvictions,
        cacheHitRate: Number(cacheHitRate.toFixed(2)),
        edgeLatency: {
            delhi: edgeStatus.delhi?.healthy ? edgeStatus.delhi.latency : null,
            pune: edgeStatus.pune?.healthy ? edgeStatus.pune.latency : null,
            london: edgeStatus.london?.healthy ? edgeStatus.london.latency : null
        }
    };

    history.push(snapshot);

    if (history.length > MAX_HISTORY) {
        history.shift();
    }

    console.log("History snapshot collected");
}

app.get("/", (req, res) => {
    res.send("Router server is working!");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", server: "router" });
});

app.get("/files/:filename", async (req, res) => {
    const filename = req.params.filename;
    const healthyEdges = getHealthyEdges();

    if (healthyEdges.length === 0) {
        return res.status(503).send("No Edge server available");
    }

    for (const edge of healthyEdges) {
        try {
            const response = await axios.get(`${edge.url}/files/${filename}`);
            return res.send(response.data);
        } catch (error) {
            console.log(`${edge.name} failed. Trying next Edge...`);
        }
    }

    return res.status(503).send("All Edge servers failed");
});

app.delete("/invalidate/:filename", async (req, res) => {
    const filename = req.params.filename;
    const results = {};

    for (const name in EDGE_SERVERS) {
        const edgeUrl = EDGE_SERVERS[name];

        try {
            const response = await axios.delete(`${edgeUrl}/cache/${filename}`);

            results[name] = {
                success: true,
                message: response.data
            };
        } catch (error) {
            results[name] = {
                success: false,
                message: "Edge server unavailable"
            };
        }
    }

    res.json({ filename, results });
});

app.get("/stats", async (req, res) => {
    const results = {};

    for (const name in EDGE_SERVERS) {
        try {
            const response = await axios.get(`${EDGE_SERVERS[name]}/stats`);

            results[name] = {
                ...response.data,
                healthy: edgeStatus[name]?.healthy ?? false,
                latency: edgeStatus[name]?.latency ?? null
            };
        } catch (error) {
            results[name] = {
                server: name,
                available: false,
                healthy: false,
                latency: null,
                message: "Edge server unavailable"
            };
        }
    }

    let totalRequests = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    let totalCacheEvictions = 0;
    let totalCachedFiles = 0;

    for (const name in results) {
        const stats = results[name];

        if (stats.available === false) {
            continue;
        }

        totalRequests += stats.requests;
        totalCacheHits += stats.cacheHits;
        totalCacheMisses += stats.cacheMisses;
        totalCacheEvictions += stats.cacheEvictions;
        totalCachedFiles += stats.cachedFiles;
    }

    const cacheHitRate = totalRequests > 0
        ? (totalCacheHits / totalRequests) * 100
        : 0;

    res.json({
        total: {
            requests: totalRequests,
            cacheHits: totalCacheHits,
            cacheMisses: totalCacheMisses,
            cacheEvictions: totalCacheEvictions,
            cachedFiles: totalCachedFiles,
            cacheHitRate: `${cacheHitRate.toFixed(2)}%`
        },
        edges: results
    });
});

app.get("/history", (req, res) => {
    res.json(history);
});

updateEdgeStatus();
setInterval(updateEdgeStatus, 10000);

collectStatsHistory();
setInterval(collectStatsHistory, 5000);

app.listen(PORT, () => {
    console.log(`Router server running on port ${PORT}`);
});
