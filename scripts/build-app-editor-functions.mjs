import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(root, "base44", "functions");
const checkOnly = process.argv.includes("--check");

const generatedFunctions = ["historicalCandleBackfill", "marketSignalRefresh"];

for (const functionName of generatedFunctions) {
  const sourcePoint = join(sourceRoot, functionName, "source.ts");
  const entryPoint = join(sourceRoot, functionName, "entry.ts");
  const result = await build({
    entryPoints: [sourcePoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["npm:*"],
    legalComments: "none",
    banner: { js: `// GENERATED from ${functionName}/source.ts. Do not edit directly.` },
  });
  assert.equal(result.outputFiles.length, 1, `${functionName} produced an unexpected generated bundle`);
  const generated = result.outputFiles[0].text;

  if (checkOnly) {
    const current = await readFile(entryPoint, "utf8");
    const canonicalCurrent = current.replace(/\r\n?/g, "\n");
    const canonicalGenerated = generated.replace(/\r\n?/g, "\n");
    assert.equal(canonicalCurrent, canonicalGenerated, `${functionName}/entry.ts is stale; run npm run build:app-editor-functions`);
  } else {
    await writeFile(entryPoint, generated, "utf8");
  }
}

const sourceEntries = (await readdir(sourceRoot, { withFileTypes: true }))
  .filter((item) => item.isDirectory())
  .map((item) => item.name)
  .sort();

assert.equal(sourceEntries.length, 22, "expected 22 Base44 backend functions");

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
  generated: generatedFunctions,
}, null, 2));
