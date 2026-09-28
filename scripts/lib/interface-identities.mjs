import { id } from "ethers";

export const SIGNATURES = Object.freeze({
  tip: "tip(address,address,uint256,uint8,bytes32,string)",
  airdrop: "airdrop(address,address,uint256,uint8,bytes32,string)",
  tippedOut: "tippedOut(address,address)",
  tippedIn: "tippedIn(address,address)",
  airdroppedOut: "airdroppedOut(address,address)",
  airdroppedIn: "airdroppedIn(address,address)",
  recordCountByAccount: "recordCountByAccount(address)",
  nextRecordId: "nextRecordId()",
  assetAllowed: "assetAllowed(address)",
});

export function selector(signature) {
  return id(signature).slice(0, 10);
}

export function xorSelectors(signatures) {
  const value = signatures.reduce(
    (result, signature) => result ^ BigInt(selector(signature)),
    0n,
  );
  return `0x${value.toString(16).padStart(8, "0")}`;
}

export const SELECTORS = Object.freeze(
  Object.fromEntries(Object.entries(SIGNATURES).map(([name, signature]) => [name, selector(signature)])),
);

const coreSignatures = [SIGNATURES.tip, SIGNATURES.airdrop];
const ledgerSignatures = [
  SIGNATURES.tippedOut,
  SIGNATURES.tippedIn,
  SIGNATURES.airdroppedOut,
  SIGNATURES.airdroppedIn,
  SIGNATURES.recordCountByAccount,
  SIGNATURES.nextRecordId,
];

export const INTERFACE_IDS = Object.freeze({
  core: xorSelectors(coreSignatures),
  ledgerExtension: xorSelectors(ledgerSignatures),
  assetPolicy: xorSelectors([SIGNATURES.assetAllowed]),
  compositeDiscovery: xorSelectors([...coreSignatures, ...ledgerSignatures]),
});
