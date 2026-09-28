const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

async function loadIdentities() {
  try {
    return await import("../scripts/lib/interface-identities.mjs");
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") return null;
    throw error;
  }
}

describe("Semantic Contribution Proof interface identities", function () {
  it("derives the frozen writer selectors and core interface ID", async function () {
    const identities = await loadIdentities();

    assert.notEqual(identities, null, "interface identity generator is missing");
    assert.equal(identities.SELECTORS.tip, "0x493a4dd0");
    assert.equal(identities.SELECTORS.airdrop, "0xe1a7a13f");
    assert.equal(identities.INTERFACE_IDS.core, "0xa89decef");
  });

  it("keeps extension, optional policy, and composite identities distinct", async function () {
    const identities = await loadIdentities();

    assert.notEqual(identities, null, "interface identity generator is missing");
    assert.equal(identities.INTERFACE_IDS.ledgerExtension, "0x1ac292fe");
    assert.equal(identities.INTERFACE_IDS.assetPolicy, "0x716d3dcb");
    assert.equal(identities.INTERFACE_IDS.compositeDiscovery, "0xb25f7e11");
    assert.notEqual(
      identities.INTERFACE_IDS.compositeDiscovery,
      identities.INTERFACE_IDS.ledgerExtension,
    );
  });
});
