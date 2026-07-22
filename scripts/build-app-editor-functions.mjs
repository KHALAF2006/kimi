import assert from "node:assert/strict";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, "base44", "functions");
const outputRoot = join(root, "functions");
const checkOnly = process.argv.includes("--check");
const normalizeLineEndings = (value) => value.replace(/\r\n?/g, "\n");

const sourceEntries = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort();

assert.equal(sourceEntries.length, 14, "expected 14 Base44 backend functions");
await mkdir(outputRoot, { recursive: true });

const expectedFiles = new Set();
for (const functionName of sourceEntries) {
  const entryPoint = join(sourceRoot, functionName, "entry.ts");
  const targetName = `${functionName}.ts`;
  expectedFiles.add(targetName);
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["npm:*"],
    legalComments: "none",
    banner: { js: `// GENERATED from base44/functions/${functionName}/entry.ts — do not edit directly.` },
  });
  assert.equal(result.outputFiles.length, 1, `${functionName} produced an unexpected bundle`);
  const generated = result.outputFiles[0].text;
  const target = join(outputRoot, targetName);
  if (checkOnly) {
    const current = await readFile(target, "utf8").catch(() => "");
    assert.equal(normalizeLineEndings(current), normalizeLineEndings(generated), `functions/${targetName} is stale; run npm run build:app-editor-functions`);
  } else {
    await writeFile(target, generated, "utf8");
  }
}

if (!checkOnly) {
  for (const item of await readdir(outputRoot, { withFileTypes: true })) {
    if (item.isFile() && item.name.endsWith(".ts") && !expectedFiles.has(item.name)) {
      await unlink(join(outputRoot, item.name));
    }
  }
}

console.log(JSON.stringify({ status: checkOnly ? "verified" : "generated", functions: sourceEntries.length, output: "functions/" }, null, 2));
