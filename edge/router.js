const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 7000;

const EDGE_SERVERS = {
    delhi: "http://localhost:4000",
    pune: "http://localhost:5000",
    london: "http://localhost:6000"
};


// Stores health + latency information
const edgeStatus = {};


// Update Edge server health and latency

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


// Get all healthy Edges sorted by latency

function getHealthyEdges() {

    const healthyEdges = [];


    for (const name in edgeStatus) {

        const status = edgeStatus[name];


        // Ignore unhealthy Edge
        if (status.healthy === false) {
            continue;
        }


        healthyEdges.push({
            name: name,
            url: EDGE_SERVERS[name],
            latency: status.latency
        });
    }


    // Fastest Edge first
    healthyEdges.sort((a, b) => {
        return a.latency - b.latency;
    });


    return healthyEdges;
}

// Router home

app.get("/", (req, res) => {

    res.send("Router server is working!");

});


// File request + Edge failover

app.get("/files/:filename", async (req, res) => {

    const filename = req.params.filename;

    console.log(`\nRequest received for: ${filename}`);


    const healthyEdges = getHealthyEdges();


    if (healthyEdges.length === 0) {

        return res
            .status(503)
            .send("No Edge server available");
    }


    // Try Edges from fastest to slowest
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


    // Every Edge failed
    res
        .status(503)
        .send("All Edge servers failed");
});

// Centralized cache invalidation

app.delete("/invalidate/:filename", async (req, res) => {

    const filename = req.params.filename;

    console.log(`\nInvalidating cache for: ${filename}`);


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
                message: "Edge server unavailable"
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
});


// Start health monitoring

updateEdgeStatus();


// Check Edge health every 10 seconds
setInterval(updateEdgeStatus, 10000);

// Start Router


app.listen(PORT, () => {

    console.log(
        `Router server running on http://localhost:${PORT}`
    );

});