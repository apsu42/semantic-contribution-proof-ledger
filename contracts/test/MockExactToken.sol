// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockExactToken is ERC20 {
    constructor() ERC20("Exact Token", "EXACT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
