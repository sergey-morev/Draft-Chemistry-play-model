import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".wav": "audio/wav", ".md": "text/plain" };
const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405).end(); return; }
  let filename;
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (!["index.html", "styles.css", "app.js"].includes(requested) && !["src", "data", "audio", "vendor"].includes(requested.split("/")[0])) throw new Error("Not a runtime resource");
    filename = fs.realpathSync(path.join(root, pathname === "/" ? "index.html" : pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith("..") || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith(".") || part === "portfolio")) throw new Error("Forbidden path");
    if (!fs.statSync(filename).isFile()) throw new Error("Not a file");
  } catch { res.writeHead(404).end("Not found"); return; }
  const ext = path.extname(filename);
  res.writeHead(200, { "Content-Type": `${types[ext] || "application/octet-stream"}${[".html", ".js", ".css", ".json", ".md"].includes(ext) ? "; charset=utf-8" : ""}`, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(filename).pipe(res);
});
let port = Number(process.env.PORT || 4180);
server.on("error", error => {
  if (error.code === "EADDRINUSE" && port > 0 && port < 4189) { port++; server.listen(port, "127.0.0.1"); }
  else { console.error(error); process.exitCode = 1; }
});
server.listen(port, "127.0.0.1", () => console.log(`Chemistry Play Model: http://127.0.0.1:${server.address().port}/`));
