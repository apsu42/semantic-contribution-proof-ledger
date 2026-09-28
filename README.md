# Semantic Contribution Proof Ledger — BAP discussion package

This public, CC0-1.0 application-standard discussion package is maintained by
`apsu42`. It is a pre-submission proposal for BNB Chain; no BAP number or
acceptance is claimed. The [draft](BAPs/BAP-xxxx.md) is the proposal text.
The contract ABI is EVM-compatible. The `IERC...` names are retained to avoid
changing the frozen function selectors and ERC-165 interface IDs.

## Materials

- [BAP discussion draft](BAPs/BAP-xxxx.md)
- [Core writer interface](contracts/interfaces/IERCContributionProof.sol)
- [Optional aggregate interface](contracts/interfaces/IERCContributionProofLedger.sol)
- [Optional asset policy interface](contracts/interfaces/IContributionAssetPolicy.sol)
- [Reference implementation](contracts/reference/ERCContributionProof.sol)
- [Conformance and adversarial tests](test/)
- [Deterministic test vectors](vectors/test-vectors.json)
- [CC0 license](LICENSE.md)

The core defines Tip and Airdrop settlement receipts. A subject or memo is a
sender assertion, not proof of consent, endorsement, charitable status,
reputation, ownership, governance rights, or financial claims. Profile and
attestation systems are separate. No public-network deployment or audit is
claimed by the presence of this package.

## Reproduce

Requires Node.js 22.14+ and pnpm 10.25.0 (via Corepack):

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm typecheck
corepack pnpm run check:selectors
corepack pnpm run check:interface-ids
corepack pnpm run check:spec-parity
```

## Existing work to compare

- [BEP-20](https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP20.md)
- [ERC-7699 Transfer Reference](https://eips.ethereum.org/EIPS/eip-7699)
- [ERC-8204 Token Payments discussion](https://ethereum-magicians.org/t/erc-8204-token-payments/28046)
- [BEP-1 process](https://github.com/bnb-chain/BEPs/blob/master/BEPs/BEP1.md)
- [BAP guidelines](https://github.com/bnb-chain/BEPs/blob/master/BAPs/README.md)
