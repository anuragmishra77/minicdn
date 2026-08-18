const express = require("express");
const axios = require("axios");

const app = express();

const PORT = Number(process.env.PORT) || 4000;
const ORIGIN_URL = process.env.ORIGIN_URL || "http://localhost:3000";

const cache = new Map();

const CACHE_TTL = 30 * 1000;
const MAX_CACHE_SIZE = 5;

const stats = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheEvictions: 0
};

app.get("/", (req, res) => {
    res.send("Delhi Edge server is working!");
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", server: "delhi" });
});

app.get("/stats", (req, res) => {
    res.json({
        server: "delhi",
        requests: stats.requests,
        cacheHits: stats.cacheHits,
        cacheMisses: stats.cacheMisses,
        cacheEvictions: stats.cacheEvictions,
        cachedFiles: cache.size
    });
});

app.get("/files/:filename", async (req, res) => {
    stats.requests++;
    const filename = req.params.filename;

    console.log(`Request received for: ${filename}`);

    if (cache.has(filename)) {
        const cachedFile = cache.get(filename);

        if (Date.now() < cachedFile.expiresAt) {
            stats.cacheHits++;
            console.log(`CACHE HIT: ${filename}`);

            cache.delete(filename);
            cache.set(filename, cachedFile);

            return res.send(cachedFile.data);
        }

        console.log(`CACHE EXPIRED: ${filename}`);
        cache.delete(filename);
    }

    stats.cacheMisses++;
    console.log(`CACHE MISS: ${filename}`);

    try {
        const response = await axios.get(`${ORIGIN_URL}/files/${filename}`);
        const file = response.data;

        if (cache.size >= MAX_CACHE_SIZE) {
            const oldestFilename = cache.keys().next().value;
            stats.cacheEvictions++;
            console.log(`LRU EVICTION: Removing ${oldestFilename}`);
            cache.delete(oldestFilename);
        }

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

app.listen(PORT, () => {
    console.log(`Delhi Edge server running on port ${PORT}`);
});
