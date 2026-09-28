// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

/// @title Semantic contribution proof aggregate extension
/// @notice Optional per-deployment totals and record sequence.
interface IERCContributionProofLedger {
    function tippedOut(address account, address asset) external view returns (uint256);

    function tippedIn(address account, address asset) external view returns (uint256);

    function airdroppedOut(address account, address asset) external view returns (uint256);

    function airdroppedIn(address account, address asset) external view returns (uint256);

    function recordCountByAccount(address account) external view returns (uint256);

    function nextRecordId() external view returns (uint256);
}
