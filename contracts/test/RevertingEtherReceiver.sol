// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

contract RevertingEtherReceiver {
    receive() external payable {
        revert("REJECT_NATIVE");
    }
}
