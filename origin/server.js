const express = require("express");
const path = require("path");

const app = express();

const PORT = 3000;

app.get("/files/:filename", (req, res) => {
    const filename = req.params.filename;

    const filePath = path.join(__dirname, "files", filename);

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send("File not found");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Origin server running on http://localhost:${PORT}`);
});