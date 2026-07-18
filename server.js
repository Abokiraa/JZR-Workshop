const express = require("express");
const os = require("os");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
}));

// In-memory key/value store — good enough for a single workshop session.
// Everything resets when you stop the server.
const store = new Map();

app.get("/api/storage", (req, res) => {
  const prefix = req.query.prefix || "";
  const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
  res.json({ keys, prefix });
});

app.get("/api/storage/:key", (req, res) => {
  const key = req.params.key;
  if (!store.has(key)) return res.status(404).json({ error: "not found" });
  res.json({ key, value: store.get(key) });
});

app.put("/api/storage/:key", (req, res) => {
  const key = req.params.key;
  const value = req.body && req.body.value;
  if (typeof value !== "string") {
    return res.status(400).json({ error: "value must be a string" });
  }
  store.set(key, value);
  res.json({ key, value });
});

app.delete("/api/storage/:key", (req, res) => {
  const key = req.params.key;
  store.delete(key);
  res.json({ key, deleted: true });
});

app.post("/api/log-error", (req, res) => {
  const { message, source, line, col, stack } = req.body || {};
  console.log("\n🔴 CLIENT ERROR:");
  console.log("  message:", message);
  if (source) console.log("  at:", `${source}:${line}:${col}`);
  if (stack) console.log("  stack:", stack);
  console.log("");
  res.json({ ok: true });
});

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nSafety Culture Live — running locally\n`);
  console.log(`On this computer: http://localhost:${PORT}`);
  const ips = getLocalIPs();
  if (ips.length) {
    console.log(`On phones (same Wi-Fi):`);
    ips.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
  } else {
    console.log(`Could not detect a local network IP — check your Wi-Fi connection.`);
  }
  console.log(`\nOpen the Admin screen on your laptop, and have people join from the phone link above.\n`);
});
