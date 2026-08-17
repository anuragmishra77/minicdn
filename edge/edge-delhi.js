const express = require("express");
const axios = require("axios");

const app = express();

const PORT = 4000;
const ORIGIN_URL = "http://localhost:3000";

const cache = new Map();

const CACHE_TTL = 30 * 1000;


// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        server: "delhi"
    });
});

app.delete("/cache/:filename", (req, res) => {

    const filename = req.params.filename;

    if (cache.has(filename)) {

        cache.delete(filename);

        console.log(`CACHE INVALIDATED: ${filename}`);

        return res.send(`Cache deleted for ${filename}`);
    }

    console.log(`No cache found for: ${filename}`);

    res.send(`No cache found for ${filename}`);
});


// File request
app.get("/files/:filename", async (req, res) => {

    const filename = req.params.filename;

    console.log(`Request received for: ${filename}`);


    // Check cache
    if (cache.has(filename)) {

        const cachedFile = cache.get(filename);

        // Check TTL
        if (Date.now() < cachedFile.expiresAt) {

            console.log(`CACHE HIT: ${filename}`);

            return res.send(cachedFile.data);

        } else {

            console.log(`CACHE EXPIRED: ${filename}`);

            cache.delete(filename);
        }
    }


    // Cache miss
    console.log(`CACHE MISS: ${filename}`);

    try {

        const response = await axios.get(
            `${ORIGIN_URL}/files/${filename}`
        );

        const file = response.data;


        // Store file with TTL
        cache.set(filename, {
            data: file,
            expiresAt: Date.now() + CACHE_TTL
        });


        console.log(`Stored ${filename} in cache`);

        res.send(file);

    } catch (error) {

        console.log("Could not fetch file from Origin");

        res.status(404).send("File not found");
    }
});


app.listen(PORT, () => {

    console.log(
        `Edge server running on http://localhost:${PORT}`
    );

});