import assert from "node:assert/strict";
import { SELECTORS } from "./lib/interface-identities.mjs";

assert.equal(SELECTORS.tip, "0x493a4dd0", "tip selector drifted");
assert.equal(SELECTORS.airdrop, "0xe1a7a13f", "airdrop selector drifted");

process.stdout.write(`tip=${SELECTORS.tip}\nairdrop=${SELECTORS.airdrop}\n`);
