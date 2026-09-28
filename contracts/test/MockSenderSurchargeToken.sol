// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSenderSurchargeToken is ERC20 {
    address public taxedSender;

    constructor() ERC20("Sender surcharge test token", "SUR") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setTaxedSender(address sender) external {
        taxedSender = sender;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && from == taxedSender && amount > 0) {
            super._update(from, address(0), 1);
        }
        super._update(from, to, amount);
    }
}
