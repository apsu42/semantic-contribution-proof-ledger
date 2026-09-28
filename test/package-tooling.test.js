const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { resolve } = require("node:path");
const { describe, it } = require("node:test");

const root = resolve(__dirname, "..");

describe("BAP discussion package", function () {
  it("keeps the draft, interfaces, vectors, and reference in parity", async function () {
    const { collectParityDiagnostics } = await import("../scripts/lib/spec-parity.mjs");
    assert.deepEqual(await collectParityDiagnostics(root), []);
  });

  it("rejects missing draft status and required BAP sections", async function () {
    const { collectBapFormatDiagnostics } = await import("../scripts/lib/spec-parity.mjs");
    const spec = await readFile(resolve(root, "BAPs/BAP-xxxx.md"), "utf8");
    assert.deepEqual(collectBapFormatDiagnostics(spec), []);
    assert.match(collectBapFormatDiagnostics(spec.replace("BAP: xxxx", ""))[0], /BAP: xxxx/);
    assert.match(collectBapFormatDiagnostics(spec.replace("Status: Draft", ""))[0], /Status: Draft/);
  });

  it("publishes deterministic selectors, IDs, and sequence vectors", async function () {
    const vectors = JSON.parse(await readFile(resolve(root, "vectors/test-vectors.json"), "utf8"));
    assert.equal(vectors.schema, "semantic-contribution-proof-ledger-test-vectors-v1");
    assert.deepEqual(vectors.selectors, {tip: "0x493a4dd0", airdrop: "0xe1a7a13f"});
    assert.equal(vectors.interfaceIds.core, "0xa89decef");
    assert.equal(vectors.interfaceIds.ledgerExtension, "0x1ac292fe");
    assert.equal(vectors.interfaceIds.assetPolicy, "0x716d3dcb");
    assert.equal(vectors.interfaceIds.compositeDiscovery, "0xb25f7e11");
    assert.deepEqual(vectors.recordSequence, {first:"1", increment:"1", reuseAllowed:false});
  });
});
