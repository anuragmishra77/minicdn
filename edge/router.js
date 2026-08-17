const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = 7000;

const EDGE_SERVERS = {
    delhi: "http://localhost:4000",
    pune: "http://localhost:5000",
    london: "http://localhost:6000"
};

const edgeStatus = {};

const history = [];
const MAX_HISTORY = 60;


// ==========================================
// Check Edge Health + Latency
// ==========================================

async function updateEdgeStatus() {

    for (const name in EDGE_SERVERS) {

        const url = EDGE_SERVERS[name];

        const startTime = Date.now();

        try {

            await axios.get(`${url}/health`);

            const endTime = Date.now();

            const latency = endTime - startTime;

            edgeStatus[name] = {
                latency: latency,
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


// ==========================================
// Get Healthy Edges
// ==========================================

function getHealthyEdges() {

    const healthyEdges = [];

    for (const name in edgeStatus) {

        const status = edgeStatus[name];

        if (status.healthy === false) {
            continue;
        }

        healthyEdges.push({
            name: name,
            url: EDGE_SERVERS[name],
            latency: status.latency
        });
    }

    healthyEdges.sort((a, b) => {
        return a.latency - b.latency;
    });

    return healthyEdges;
}


// ==========================================
// Collect Metrics History
// ==========================================

async function collectStatsHistory() {

    let totalRequests = 0;
    let totalCacheHits = 0;
    let totalCacheMisses = 0;
    let totalCacheEvictions = 0;

    // Get stats from every Edge

    for (const name in EDGE_SERVERS) {

        try {

            const response = await axios.get(
                `${EDGE_SERVERS[name]}/stats`
            );

            const stats = response.data;

            totalRequests += stats.requests;
            totalCacheHits += stats.cacheHits;
            totalCacheMisses += stats.cacheMisses;
            totalCacheEvictions += stats.cacheEvictions;

        } catch (error) {

            console.log(
                `Could not collect stats from ${name}`
            );
        }
    }


    // Calculate Cache Hit Rate

    const cacheHitRate =
        totalRequests > 0
            ? (totalCacheHits / totalRequests) * 100
            : 0;


    // Create history snapshot

    const snapshot = {

        time: new Date().toLocaleTimeString(),

        requests: totalRequests,

        cacheHits: totalCacheHits,

        cacheMisses: totalCacheMisses,

        cacheEvictions: totalCacheEvictions,

        cacheHitRate: Number(
            cacheHitRate.toFixed(2)
        ),

        edgeLatency: {

            delhi: edgeStatus.delhi?.healthy
                ? edgeStatus.delhi.latency
                : null,

            pune: edgeStatus.pune?.healthy
                ? edgeStatus.pune.latency
                : null,

            london: edgeStatus.london?.healthy
                ? edgeStatus.london.latency
                : null

        }

    };


    // Store snapshot

    history.push(snapshot);


    // Keep maximum 60 snapshots

    if (history.length > MAX_HISTORY) {

        history.shift();

    }

    console.log("History snapshot collected");
}


// ==========================================
// Home
// ==========================================

app.get("/", (req, res) => {

    res.send("Router server is working!");

});


// ==========================================
// File Request
// ==========================================

app.get("/files/:filename", async (req, res) => {

    const filename = req.params.filename;

    console.log(
        `\nRequest received for: ${filename}`
    );


    const healthyEdges = getHealthyEdges();


    if (healthyEdges.length === 0) {

        return res
            .status(503)
            .send("No Edge server available");

    }


    // Try Edges in latency order

    for (const edge of healthyEdges) {

        console.log(
            `Trying ${edge.name} (${edge.latency} ms)`
        );

        try {

            const response = await axios.get(
                `${edge.url}/files/${filename}`
            );


            console.log(
                `Request successfully served by ${edge.name}`
            );


            return res.send(response.data);

        } catch (error) {

            console.log(
                `${edge.name} failed. Trying next Edge...`
            );

        }

    }


    res
        .status(503)
        .send("All Edge servers failed");

});


// ==========================================
// Cache Invalidation
// ==========================================

app.delete(
    "/invalidate/:filename",
    async (req, res) => {

        const filename = req.params.filename;

        console.log(
            `\nInvalidating cache for: ${filename}`
        );


        const results = {};


        for (const name in EDGE_SERVERS) {

            const edgeUrl = EDGE_SERVERS[name];


            try {

                const response = await axios.delete(
                    `${edgeUrl}/cache/${filename}`
                );


                results[name] = {

                    success: true,

                    message: response.data

                };


                console.log(
                    `Invalidated ${filename} on ${name}`
                );


            } catch (error) {

                results[name] = {

                    success: false,

                    message:
                        "Edge server unavailable"

                };


                console.log(
                    `Could not invalidate ${filename} on ${name}`
                );

            }

        }


        res.json({

            filename: filename,

            results: results

        });

    }
);


// ==========================================
// Current Stats
// ==========================================

app.get("/stats", async (req, res) => {

    const results = {};


    // Get stats from every Edge

    for (const name in EDGE_SERVERS) {

        try {

            const response = await axios.get(
                `${EDGE_SERVERS[name]}/stats`
            );


            results[name] = {

                ...response.data,

                healthy:
                    edgeStatus[name]?.healthy ?? false,

                latency:
                    edgeStatus[name]?.latency ?? null

            };


        } catch (error) {

            results[name] = {

                server: name,

                available: false,

                healthy: false,

                latency: null,

                message:
                    "Edge server unavailable"

            };

        }

    }


    // Total metrics

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

        totalCacheEvictions +=
            stats.cacheEvictions;

        totalCachedFiles +=
            stats.cachedFiles;

    }


    // Calculate hit rate

    let cacheHitRate = 0;


    if (totalRequests > 0) {

        cacheHitRate =
            (totalCacheHits /
                totalRequests) * 100;

    }


    res.json({

        total: {

            requests:
                totalRequests,

            cacheHits:
                totalCacheHits,

            cacheMisses:
                totalCacheMisses,

            cacheEvictions:
                totalCacheEvictions,

            cachedFiles:
                totalCachedFiles,

            cacheHitRate:
                `${cacheHitRate.toFixed(2)}%`

        },


        edges: results

    });

});


// ==========================================
// History
// ==========================================

app.get("/history", (req, res) => {

    res.json(history);

});


// ==========================================
// Start Background Monitoring
// ==========================================

updateEdgeStatus();

setInterval(
    updateEdgeStatus,
    10000
);


collectStatsHistory();

setInterval(
    collectStatsHistory,
    5000
);


// ==========================================
// Start Router
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Router server running on http://localhost:${PORT}`
    );

});