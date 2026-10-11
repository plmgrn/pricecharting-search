import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function filesBelow(directory, baseDirectory = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(entryPath, baseDirectory));
    else files.push(path.relative(baseDirectory, entryPath).replaceAll(path.sep, "/"));
  }
  return files;
}

describe("manifest and packaged build contracts", () => {
  test("source manifest keeps the reviewed permission set and safe extension CSP", async () => {
    const manifest = JSON.parse(await readFile(path.join(root, "src", "manifest.json"), "utf8"));
    assert.deepEqual(manifest.permissions, ["contextMenus", "storage", "activeTab", "scripting"]);
    assert.equal(manifest.background.service_worker, "background/index.js");
    assert.deepEqual(manifest.background.scripts, ["background/index.js"]);
    assert.doesNotMatch(manifest.content_security_policy.extension_pages, /unsafe-inline|unsafe-eval/);
  });

  test("build has both background bundles and excludes development-only files", async () => {
    const result = spawnSync(process.execPath, [path.join(root, "scripts", "build.js")], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const buildDir = path.join(root, "build");
    const manifest = JSON.parse(await readFile(path.join(buildDir, "manifest.json"), "utf8"));
    const files = await filesBelow(buildDir);
    assert.equal(manifest.background.service_worker, "background/background.mjs");
    assert.deepEqual(manifest.background.scripts, ["background/background.legacy.js"]);
    assert.ok(files.includes("background/background.mjs"));
    assert.ok(files.includes("background/background.legacy.js"));
    assert.ok(files.every(file => !/(^|\/)(test|local|docs)(\/|$)/i.test(file)));
    assert.ok(files.every(file => !file.endsWith(".map")));
  });
});
