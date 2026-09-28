// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

/// @title Semantic contribution proof writer interface
/// @notice Records one labeled value transfer per successful call.
interface IERCContributionProof {
    enum RecordKind {
        Tip,
        Airdrop
    }

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
