// Opens one localhost port per device app, all served by the one Next dev server on :3000.
//   4001 iPhone · 4002 iPad · 4003 iPhone Duo · 4004 Laptop
// (4000s, not 3001+, because Next.js moves to 3001 by itself when 3000 is busy.)
// Usage: npm run dev (port 3000) and, in another terminal, npm run devices.
import http from "node:http";
import net from "node:net";

const TARGET = { host: "127.0.0.1", port: Number(process.env.SKYHAND_TARGET_PORT ?? 3000) };
const DEVICES = [
  [4001, "iphone", "iPhone"],
  [4002, "ipad", "iPad"],
  [4003, "duo", "iPhone Duo"],
  [4004, "laptop", "Laptop"],
];

for (const [port, device, label] of DEVICES) {
  const server = http.createServer((req, res) => {
    const upstream = http.request(
      { ...TARGET, method: req.method, path: req.url, headers: { ...req.headers, "x-skyhand-device": device } },
      (r) => { res.writeHead(r.statusCode ?? 502, r.headers); r.pipe(res); },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`The Skyhand dev server on port ${TARGET.port} is not running. Start it with: npm run dev`);
    });
    req.pipe(upstream);
  });

  // Pass websocket upgrades through untouched (Next.js hot reload).
  server.on("upgrade", (req, socket, head) => {
    const upstream = net.connect(TARGET.port, TARGET.host, () => {
      const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
      for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
      upstream.write(lines.join("\r\n") + "\r\n\r\n");
      if (head?.length) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });

  server.on("error", (e) => console.error(`${label}: could not open port ${port} (${e.code ?? e.message})`));
  server.listen(port, () => console.log(`${label.padEnd(11)} http://localhost:${port}`));
}
