import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appFile = new URL("../base44/.app.jsonc", import.meta.url);
let configuration;
try {
  const source = await readFile(appFile, "utf8");
  configuration = JSON.parse(source.replace(/^\s*\/\/.*$/gm, ""));
} catch {
  throw new Error("Base44 backend is not linked: base44/.app.jsonc is missing. GitHub sync does not deploy entity schemas.");
}
assert.match(String(configuration.id || ""), /^[A-Za-z0-9_-]+$/, "Base44 app id is missing or invalid");
console.log(JSON.stringify({ status: "linked", appId: configuration.id }, null, 2));
