import assert from "node:assert/strict";
import { INTERFACE_IDS } from "./lib/interface-identities.mjs";

const expected = {
  core: "0xa89decef",
  ledgerExtension: "0x1ac292fe",
  assetPolicy: "0x716d3dcb",
  compositeDiscovery: "0xb25f7e11",
};

assert.deepEqual(INTERFACE_IDS, expected, "interface identity drifted");
for (const [name, value] of Object.entries(INTERFACE_IDS)) {
  process.stdout.write(`${name}=${value}\n`);
}
