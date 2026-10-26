import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("staged runtime has no laptop paths or migration/backup payload", async () => {
  const names = await readdir(root);
  for (const excluded of ["portfolio", "handoff", "preview-server.log", "preview-server.error.log"]) assert.ok(!names.includes(excluded), excluded);
  const tools = await readdir(new URL("tools/", root));
  assert.deepEqual(tools.sort(), ["browser-smoke.cjs", "serve-local.js"]);
  for (const file of ["tools/browser-smoke.cjs", "start-chemistry-play-model.bat", "package.json"]) {
    assert.ok(!/C:[/\\]Users|\.cache[/\\]codex-runtimes|Program Files/.test(await readFile(new URL(file, root), "utf8")), file);
  }
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, "module");
});

test("read-only preview serves the app and blocks non-runtime/private paths", async () => {
  const child = spawn(process.execPath, ["tools/serve-local.js"], { cwd: root, env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", data => { stderr += data; });
  try {
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server readiness timeout: " + stderr)), 10000);
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.once("exit", code => { clearTimeout(timer); reject(new Error("Server exited: " + code + " " + stderr)); });
      child.stdout.on("data", data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+\//);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
    });
    for (const file of ["", "src/main.js", "data/substances.common.ru.json", "audio/metal.wav", "vendor/lucide.min.js"]) assert.equal((await fetch(base + file)).status, 200, file);
    for (const file of [".git/config", ".env", "package.json", "docs/SCIENTIFIC_REVIEW.md", "portfolio/test", "src/../../README.md"]) assert.equal((await fetch(base + file)).status, 404, file);
    assert.equal((await fetch(base, { method: "POST" })).status, 405);
    assert.match((await fetch(base + "src/main.js")).headers.get("content-type"), /javascript/);
  } finally {
    if (child.exitCode === null) {
      const exit = new Promise(resolve => child.once("exit", resolve));
      child.kill();
      await exit;
    }
  }
});
