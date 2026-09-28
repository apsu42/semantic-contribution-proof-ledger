import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { INTERFACE_IDS, SELECTORS, SIGNATURES } from "./interface-identities.mjs";

const SPEC_PATH = "BAPs/BAP-xxxx.md";
const VECTOR_PATH = "vectors/test-vectors.json";

export function collectBapFormatDiagnostics(spec) {
  const diagnostics = [];
  for (const line of ["BAP: xxxx", "Status: Draft", "Type: Application", "## Summary", "## Motivation", "## Specification", "## Security Considerations", "## License"]) {
    if (!spec.includes(line)) diagnostics.push(`BAP draft missing ${line}`);
  }
  if (!spec.includes("This is a community review draft, not an assigned or accepted BAP.")) {
    diagnostics.push("BAP draft must disclose pre-submission status");
  }
  if (!spec.includes("[CC0-1.0](../LICENSE.md)")) diagnostics.push("BAP draft missing CC0 license link");
  return diagnostics;
}

export async function collectParityDiagnostics(root) {
  const read = (path) => readFile(resolve(root, path), "utf8");
  const [spec, core, ledger, policy, reference, vectorText] = await Promise.all([
    read(SPEC_PATH),
    read("contracts/interfaces/IERCContributionProof.sol"),
    read("contracts/interfaces/IERCContributionProofLedger.sol"),
    read("contracts/interfaces/IContributionAssetPolicy.sol"),
    read("contracts/reference/ERCContributionProof.sol"),
    read(VECTOR_PATH),
  ]);
  const vectors = JSON.parse(vectorText);
  const diagnostics = collectBapFormatDiagnostics(spec);
  const sourceSignatures = (source) => [...source.matchAll(/function\s+(\w+)\s*\(([\s\S]*?)\)\s*external/g)].map(([, name, parameters]) => {
    const types = parameters.trim() ? parameters.split(",").map((parameter) => parameter.trim().split(/\s+/).filter((part) => !["calldata", "memory", "storage"].includes(part))[0]) : [];
    return `${name}(${types.join(",")})`;
  });
  const signatures = new Set([...sourceSignatures(core), ...sourceSignatures(ledger), ...sourceSignatures(policy)]);
  for (const signature of Object.values(SIGNATURES)) {
    if (!signatures.has(signature)) diagnostics.push(`interface missing signature ${signature}`);
    if (!spec.includes(signature)) diagnostics.push(`spec missing signature ${signature}`);
  }
  for (const [name, selector] of Object.entries({tip: SELECTORS.tip, airdrop: SELECTORS.airdrop})) {
    if (vectors.selectors?.[name] !== selector) diagnostics.push(`vector selector mismatch for ${name}`);
    if (!spec.includes(selector)) diagnostics.push(`spec missing selector ${selector}`);
  }
  for (const [name, id] of Object.entries(INTERFACE_IDS)) {
    if (vectors.interfaceIds?.[name] !== id) diagnostics.push(`vector interface ID mismatch for ${name}`);
    if (!spec.includes(id)) diagnostics.push(`spec missing interface ID ${id}`);
  }
  if (vectors.recordKinds?.Tip !== 0 || vectors.recordKinds?.Airdrop !== 1) diagnostics.push("record kind vectors differ");
  if (vectors.recordSequence?.first !== "1" || vectors.recordSequence?.increment !== "1" || vectors.recordSequence?.reuseAllowed !== false) diagnostics.push("record sequence vectors differ");
  if (vectors.metadata?.maxMemoBytes !== 256 || vectors.metadata?.noneSubject !== `0x${"00".repeat(32)}` || vectors.metadata?.addressSubject !== `0x${"00".repeat(12)}${"11".repeat(20)}`) diagnostics.push("metadata vectors differ");
  if (!reference.includes("uint256 private constant _MAX_MEMO_BYTES = 256;")) diagnostics.push("reference memo bound differs");
  if (!reference.includes("subjectType == 0 && subjectId != bytes32(0)")) diagnostics.push("reference None subject check differs");
  if (!reference.includes("(subjectType == 1 || subjectType == 3)")) diagnostics.push("reference address subject check differs");
  if (!/event ContributionRecorded\([\s\S]*recordId[\s\S]*memoCid[\s\S]*\);/.test(core)) diagnostics.push("core event layout missing");
  if (/trillions|memepk|UnifiedAppGateway|ContributionLedgerModuleV1/i.test(`${spec}\n${core}\n${ledger}\n${policy}`)) diagnostics.push("normative material contains product-specific name");
  return diagnostics;
}
