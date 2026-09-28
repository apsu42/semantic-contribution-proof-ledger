// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

/// @title Optional contribution asset policy discovery interface
interface IContributionAssetPolicy {
    event AssetConfigured(address indexed asset, bool allowed, address indexed actor);

    function assetAllowed(address asset) external view returns (bool);
}
