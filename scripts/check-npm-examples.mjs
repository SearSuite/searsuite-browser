import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../examples/npm/", import.meta.url));
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "searsuite-npm-quickstart-")
);
const keep = process.argv.includes("--keep");

try {
  await cp(source, temporaryRoot, {
    recursive: true,
    filter: (path) => !["node_modules", "dist"].includes(basename(path)),
  });
  const manifest = JSON.parse(
    await readFile(join(temporaryRoot, "package.json"), "utf8")
  );
  assert.ok(
    !manifest.pnpm && !manifest.overrides && !manifest.workspaces,
    "Examples must use unmodified npm packages."
  );
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    assert.match(name, /^@searsuite\//);
    assert.equal(
      version,
      name === "@searsuite/sear-domain-workbook" ? "0.0.2" : "0.0.3",
      `Expected the tested 0.0.3 release set for ${name}.`
    );
  }
  run("npm", [
    "install",
    "--registry=https://registry.npmjs.org",
    "--no-audit",
    "--no-fund",
  ]);
  const lock = JSON.parse(
    await readFile(join(temporaryRoot, "package-lock.json"), "utf8")
  );
  let packageCount = 0;
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (!path.includes("node_modules/@searsuite/")) continue;
    assert.ok(
      !entry.link && entry.integrity,
      `Expected a registry archive at ${path}.`
    );
    assert.ok(
      entry.resolved?.startsWith("https://registry.npmjs.org/"),
      `Unexpected package origin at ${path}.`
    );
    packageCount++;
  }
  console.log(
    `Verified registry origins for ${packageCount} installed SearSuite packages.`
  );
  run("npm", ["run", "build"]);
  run("npm", ["test"]);
  run("npm", ["run", "headless"]);
  console.log(
    "npm examples passed: strict types, two production browser entries and Headless contracts."
  );
} finally {
  if (keep) console.log(`Consumer directory: ${temporaryRoot}`);
  else await rm(temporaryRoot, { recursive: true, force: true });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: temporaryRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}).`);
}
