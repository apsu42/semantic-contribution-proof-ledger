BAP: xxxx
Title: Semantic Contribution Proof Ledger
Status: Draft
Type: Application
Created: 2026-09-29
Author: apsu42
Discussions: Pending BNB Chain Forum topic

# Semantic Contribution Proof Ledger (pre-submission BAP draft)

This is a community review draft, not an assigned or accepted BAP. `xxxx` is a
placeholder; BAP editors assign the number through the official process.

## Summary

Define an application-level writer and receipt interface that atomically binds
a Tip or Airdrop label to one exact BNB or BEP-20-compatible value transfer.

## Abstract

This proposal defines a contract interface for settling a single native or BEP-20-compatible token transfer and emitting a machine-readable semantic proof that labels the transfer as either a Tip or an Airdrop. It also defines an optional aggregate-ledger extension and an independently discoverable asset-policy interface. A contribution record describes a settled transfer; it does not create governance, equity, debt, investment, repayment, or other claim rights.

## Motivation

Wallets, social applications, grant tools, and community software frequently label ordinary value transfers as tips or airdrops. Without a shared event and writer interface, each integration must interpret application-specific calldata and logs. This proposal provides a small interoperable surface that binds a semantic label and subject reference to exactly one settled transfer while leaving reputation, indexing, asset allowlists, and product policy outside the core interface.

## Specification

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

### Definitions

- `asset == address(0)` denotes the chain's native asset.
- `RecordKind.Tip` has numeric value `0`.
- `RecordKind.Airdrop` has numeric value `1`.
- A record is the `ContributionRecorded` event emitted by one successful writer call.
- Exact settlement means that the amount attributed by a record equals the amount credited to `to`.

### Core writer interface

Compliant implementations MUST implement `IERCContributionProof`:

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

interface IERCContributionProof {
    enum RecordKind { Tip, Airdrop }

    event ContributionRecorded(
        uint256 indexed recordId,
        RecordKind kind,
        address indexed from,
        address indexed to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string memoCid
    );

    function tip(
        address to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) external payable returns (uint256 recordId);

    function airdrop(
        address to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) external payable returns (uint256 recordId);
}
```

The function signatures and selectors are:

| Function signature | Selector |
| --- | --- |
| `tip(address,address,uint256,uint8,bytes32,string)` | `0x493a4dd0` |
| `airdrop(address,address,uint256,uint8,bytes32,string)` | `0xe1a7a13f` |

The ERC-165 interface ID for the core writer interface is `0xa89decef`.

Compliant implementations MUST implement ERC-165 and MUST return `true` from `supportsInterface(0xa89decef)` and `supportsInterface(0x01ffc9a7)`.

For every writer call:

1. `to` MUST NOT be the zero address.
2. `to` MUST NOT equal the account economically debited by the call.
3. `amount` MUST be greater than zero.
4. If `asset` is the native asset, `msg.value` MUST equal `amount`.
5. If `asset` is a BEP-20-compatible token, `msg.value` MUST equal zero and the recipient's token balance MUST increase by exactly `amount`.
6. A successful call MUST emit exactly one `ContributionRecorded` event and MUST return the emitted `recordId`.
7. `from` MUST identify the account economically debited by the call and MUST NOT be supplied as caller-controlled attribution for another account.
8. Settlement, state changes, and event emission MUST succeed or revert atomically.
9. Implementations MUST NOT emit `ContributionRecorded` for a failed or inexact settlement.
10. Implementations MUST accept unrecognized `subjectType` values without changing the event layout. Applications MAY apply their own display or policy rules to those values.

An implementation MAY reject a BEP-20-compatible asset whose transfer behavior cannot satisfy exact settlement. Fee-on-transfer, rebasing, blocklisting, callback, or otherwise non-standard tokens MUST NOT produce a record whose `amount` differs from the recipient's observed balance increase.

The recorded `amount` is the amount credited to `to`, not necessarily the total cost debited from the payer. An implementation MAY reject any asset for which it cannot prove the credited amount or safely account for a greater payer-side debit.

### Record identifiers

Within one contract deployment, the first successful record MUST use `recordId` `1`. Each later successful record MUST increment the preceding identifier by exactly one. Failed calls MUST NOT consume an identifier, and an identifier MUST NOT be reused. The identifier is deployment-local; consumers MUST combine chain ID and emitting contract address with `recordId` when constructing a globally unique key.

### Account, custody, and consent boundary

The core interface does not grant custody, create an allowance, or authorize a third party to attribute a contribution to another account. For a direct externally owned account or smart-account call, `from` is the account whose native asset or BEP-20-compatible balance is debited. A relay that pays from its own balance is therefore `from`. An implementation that supports relayed attribution MUST authenticate the attributed account, debit that account's authorized funds atomically, and prevent the relay or caller from choosing an arbitrary `from` value.

Recipient consent is not required for settlement. Receipt of a record proves neither that `to` requested the transfer nor that `to` accepts, endorses, or controls the asserted subject or memo.

### Subject types

The following values provide common interpretation without restricting future values:

| Value | Meaning |
| --- | --- |
| `0` | No subject |
| `1` | Address subject |
| `2` | Arbitrary `bytes32` subject |
| `3` | Token address encoded as `bytes32` |
| `4` | Demand or request identifier |
| `5` | Campaign identifier |
| `6` | Content identifier |
| `7` | Charity identifier |
| `8` through `127` | Reserved for future BAP revisions |
| `128` through `255` | Application-defined |

`subjectId` and `memoCid` are assertions made by the caller. Implementations and indexers MUST NOT treat either field as proof that referenced content is authentic, available, safe, or controlled by a particular party.

For subject type `0`, `subjectId` MUST be `bytes32(0)`. For subject types `1` and `3`, the address MUST occupy the low-order 20 bytes of `subjectId` and the high-order 12 bytes MUST be zero. Other recognized subject types use application- or ecosystem-defined `bytes32` identifiers. `memoCid` MAY be empty and MUST NOT exceed 256 UTF-8 bytes.

### Aggregate-ledger extension

Implementations MAY expose per-deployment aggregates through `IERCContributionProofLedger`:

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

interface IERCContributionProofLedger {
    function tippedOut(address account, address asset) external view returns (uint256);
    function tippedIn(address account, address asset) external view returns (uint256);
    function airdroppedOut(address account, address asset) external view returns (uint256);
    function airdroppedIn(address account, address asset) external view returns (uint256);
    function recordCountByAccount(address account) external view returns (uint256);
    function nextRecordId() external view returns (uint256);
}
```

The ERC-165 interface ID for this extension alone is `0x1ac292fe`. An implementation exposing both the core writer interface and this extension MAY additionally return `true` for the composite discovery ID `0xb25f7e11`. The composite discovery ID is the XOR of all core and extension function selectors; it is not the extension-only interface ID.

The extension function signatures are `tippedOut(address,address)`, `tippedIn(address,address)`, `airdroppedOut(address,address)`, `airdroppedIn(address,address)`, `recordCountByAccount(address)`, and `nextRecordId()`.

Aggregate values are local to one contract instance. Consumers MUST NOT interpret them as universal reputation or combine deployments without an explicit trust and identity policy.

For each successful Tip, `tippedOut(from, asset)` and `tippedIn(to, asset)` MUST each increase by exactly `amount`. For each successful Airdrop, `airdroppedOut(from, asset)` and `airdroppedIn(to, asset)` MUST each increase by exactly `amount`. `recordCountByAccount(from)` and `recordCountByAccount(to)` MUST each increase by exactly one for either kind. Failed calls MUST leave every aggregate and `nextRecordId()` unchanged.

### Optional asset policy

Implementations MAY expose an asset allowlist or other binary policy through:

```solidity
// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

interface IContributionAssetPolicy {
    event AssetConfigured(address indexed asset, bool allowed, address indexed actor);
    function assetAllowed(address asset) external view returns (bool);
}
```

The ERC-165 interface ID for this optional policy is `0x716d3dcb`. Asset policy is not part of core compliance or the aggregate-ledger extension.
The policy function signature is `assetAllowed(address)`.

### Record semantics

A `ContributionRecorded` event proves only that the emitting contract completed the settlement rules it implements for the recorded call. A record MUST NOT, by itself, be interpreted as creating governance power, ownership, equity, debt, investment status, repayment rights, tax treatment, charitable status, or a claim against any person, application, organization, or asset.

A settled record is immutable transaction history. The core interface defines no revocation, deletion, recipient-acceptance, or correction operation. A correction MAY be represented by a later record or by an external annotation protocol, but MUST NOT be presented as erasing or mutating the original settlement.

## Rationale

Tip and Airdrop share one event because indexers need one stable proof format while users and applications need the semantic kind preserved. Single-recipient calls keep settlement and attribution auditable; batching can be composed as multiple calls without introducing ambiguous partial success or aggregate event semantics.

The aggregate getters are a separate interface because event-only implementations can comply with the core standard. Asset policy is separate because a permissionless reference implementation and a governed application have different acceptable-asset models. Explicit extension and composite IDs prevent ERC-165 consumers from mistaking optional behavior for core compliance.

Exact recipient balance deltas prevent records from overstating transfers when a BEP-20-compatible token charges transfer fees or mutates balances. The standard does not require support for every token behavior.

General-purpose attestation protocols, including EAS and BAS, can express arbitrary schemas and claims but do not by themselves require an exact value transfer. This proposal provides the narrower atomic settlement-and-event primitive. Applications may reference its records from an attestation system, but this proposal neither replaces nor inherits trust from that system.

## Relationship to existing standards

BEP-20 token `Transfer` events record value movement but do not encode Tip or
Airdrop intent. ERC-7699 adds a transfer reference to an extended token ABI;
this proposal uses a separate writer so it can also settle native BNB and
existing BEP-20-compatible tokens without changing token contracts. Its receipt
binds the label and reference to a verified recipient balance increase.
ERC-165 is used for interface discovery. General-purpose attestations such as
EAS and BAS can carry claims, but do not themselves impose exact settlement.
ERC-8204 proposes generic payment signaling across native-asset and settler
flows. This draft instead specifies two contribution kinds and exact settlement
rules. Reviewers should determine whether these requirements justify a separate
BAP, or fit better as a profile or extension of ERC-8204. The proposed interface
neither supersedes these standards nor inherits their trust guarantees.

## Backwards Compatibility

This proposal introduces new functions and events and does not alter an existing BEP or token standard. Contracts may implement it alongside other interfaces. Existing value-transfer applications require an adapter or contract upgrade to emit conforming records.

## Reference Implementation

A CC0 reference implementation and conformance vectors are provided in this repository under `contracts/reference/` and `vectors/`. The reference implementation uses ERC-165, rejects self-transfers and zero amounts, requires exact native value, checks BEP-20-compatible contract and recipient balance deltas, and reverts atomically when settlement is not exact.

## Test Cases

The repository contains conformance and adversarial Hardhat tests covering
native BNB transfers, BEP-20-compatible transfers, event and record sequencing,
fee-on-transfer and rebasing behavior, sender surcharges,
and atomic rollback on failed settlement. `vectors/test-vectors.json` freezes
selectors, interface IDs, record kinds, and metadata encodings.

## Security Considerations

Implementations should prevent reentrancy across settlement, aggregate mutation, and event emission. State changes made before an external native or token transfer must revert with that transfer.

BEP-20-compatible contracts may charge fees, rebase, block accounts, return malformed values, invoke callbacks, or report balances inconsistently. Implementations must use safe token-call handling and must verify exact balance deltas. A successful token call alone is insufficient evidence of exact settlement.

Native recipients may revert. A failed recipient call must revert the record and all aggregate changes. Implementations should avoid unbounded recipient-controlled execution after irreversible state changes.

`memoCid` may reference unavailable, mutable, illegal, deceptive, or malicious content. Clients should treat it as untrusted input, apply length and rendering limits, avoid automatic fetching, and clearly identify the party making the assertion.

Subject values do not authenticate a token, campaign, content item, charity, or other entity. Indexers should preserve the raw values and applications should apply explicit registries or verification rules when presenting trusted labels.

Unsolicited records can be used for spam, impersonation, or receiver-profile poisoning. Wallets and indexers should distinguish settled-but-unsolicited records from accepted credentials, provide filtering and hiding controls, and avoid ranking an account by raw incoming counts or amounts. Presentation controls do not revoke or erase the underlying chain history.

Relayers, forwarders, and account-abstraction bundlers can obscure who paid gas versus whose funds were transferred. Implementations must derive `from` from the account actually and atomically debited; signatures or caller-supplied addresses without corresponding authorized settlement are insufficient. Indexers should not infer attribution from the transaction origin or gas payer.

Records are scoped to the emitting contract and chain. Indexers should use chain ID, contract address, transaction hash, and log index for replay-safe identity and should handle chain reorganizations before presenting finality.

Approval transactions expose token allowances. Clients should request only the amount required by the contribution and should distinguish approval confirmation from contribution confirmation.

The no-rights rule in this proposal is a technical semantic boundary, not legal advice. Applications remain responsible for their own representations and regulatory obligations.

## License

Copyright and related rights are waived under [CC0-1.0](../LICENSE.md).
