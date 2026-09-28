// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev The second transfer in one contribution removes one unit from its recipient.
contract MockRebasingToken is ERC20 {
    uint256 private transferCount;

    constructor() ERC20("Rebasing Token", "REBASE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            transferCount += 1;
            if (transferCount == 2 && amount > 1) {
                super._update(from, to, amount);
                super._update(to, address(0), 1);
                return;
            }
        }
        super._update(from, to, amount);
    }
}
