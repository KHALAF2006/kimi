import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, "base44", "functions");
const checkOnly = process.argv.includes("--check");

const sourceEntries = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort();

assert.equal(sourceEntries.length, 20, "expected 20 Base44 backend functions");

for (const functionName of sourceEntries) {
  const entryPoint = join(sourceRoot, functionName, "entry.ts");
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["npm:*"],
    legalComments: "none",
  });
  assert.equal(result.outputFiles.length, 1, `${functionName} produced an unexpected bundle`);
}

console.log(JSON.stringify({
  status: "verified",
  mode: checkOnly ? "acceptance-check" : "direct-base44-functions",
  functions: sourceEntries.length,
  source: "base44/functions/",
}, null, 2));
