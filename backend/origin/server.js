const express = require("express");
const path = require("path");

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.get("/files/:filename", (req, res) => {
    const filename = req.params.filename;

    const filePath = path.join(__dirname, "files", filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send("File not found");
        }
    });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", server: "origin" });
});

app.listen(PORT, () => {
    console.log(`Origin server running on port ${PORT}`);
});
