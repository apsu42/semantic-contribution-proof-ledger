// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IERCContributionProof} from "../interfaces/IERCContributionProof.sol";
import {IERCContributionProofLedger} from "../interfaces/IERCContributionProofLedger.sol";

/// @title Semantic Contribution Proof Ledger reference implementation
/// @notice Minimal ledger with exact native and ERC-20 settlement.
contract ERCContributionProof is
    ERC165,
    ReentrancyGuard,
    IERCContributionProof,
    IERCContributionProofLedger
{
    using SafeERC20 for IERC20;

    bytes4 private constant _CORE_INTERFACE_ID = 0xa89decef;
    bytes4 private constant _LEDGER_EXTENSION_INTERFACE_ID = 0x1ac292fe;
    bytes4 private constant _COMPOSITE_DISCOVERY_ID = 0xb25f7e11;
    uint256 private constant _MAX_MEMO_BYTES = 256;

    error InvalidAddress();
    error InvalidAmount();
    error SelfTransfer();
    error NativeValueMismatch();
    error UnexpectedNativeValue();
    error NativeTransferFailed();
    error InexactTokenSettlement();
    error InvalidSubject();
    error MemoTooLong();

    uint256 public override nextRecordId = 1;
    mapping(address account => mapping(address asset => uint256 amount)) public override tippedOut;
    mapping(address account => mapping(address asset => uint256 amount)) public override tippedIn;
    mapping(address account => mapping(address asset => uint256 amount)) public override airdroppedOut;
    mapping(address account => mapping(address asset => uint256 amount)) public override airdroppedIn;
    mapping(address account => uint256 count) public override recordCountByAccount;

    function tip(
        address to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) external payable override nonReentrant returns (uint256 recordId) {
        return _contribute(
            RecordKind.Tip,
            to,
            asset,
            amount,
            subjectType,
            subjectId,
            memoCid
        );
    }

    function airdrop(
        address to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) external payable override nonReentrant returns (uint256 recordId) {
        return _contribute(
            RecordKind.Airdrop,
            to,
            asset,
            amount,
            subjectType,
            subjectId,
            memoCid
        );
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == _CORE_INTERFACE_ID
            || interfaceId == _LEDGER_EXTENSION_INTERFACE_ID
            || interfaceId == _COMPOSITE_DISCOVERY_ID
            || super.supportsInterface(interfaceId);
    }

    function _contribute(
        RecordKind kind,
        address to,
        address asset,
        uint256 amount,
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) private returns (uint256 recordId) {
        if (to == address(0)) revert InvalidAddress();
        if (to == msg.sender) revert SelfTransfer();
        if (amount == 0) revert InvalidAmount();
        _validateMetadata(subjectType, subjectId, memoCid);

        _receiveAsset(asset, amount);

        recordId = nextRecordId;
        nextRecordId = recordId + 1;
        if (kind == RecordKind.Tip) {
            tippedOut[msg.sender][asset] += amount;
            tippedIn[to][asset] += amount;
        } else {
            airdroppedOut[msg.sender][asset] += amount;
            airdroppedIn[to][asset] += amount;
        }
        recordCountByAccount[msg.sender] += 1;
        recordCountByAccount[to] += 1;

        _sendAsset(to, asset, amount);

        emit ContributionRecorded(
            recordId,
            kind,
            msg.sender,
            to,
            asset,
            amount,
            subjectType,
            subjectId,
            memoCid
        );
    }

    function _validateMetadata(
        uint8 subjectType,
        bytes32 subjectId,
        string calldata memoCid
    ) private pure {
        if (subjectType == 0 && subjectId != bytes32(0)) revert InvalidSubject();
        if ((subjectType == 1 || subjectType == 3) && uint256(subjectId) >> 160 != 0) {
            revert InvalidSubject();
        }
        if (bytes(memoCid).length > _MAX_MEMO_BYTES) revert MemoTooLong();
    }

    function _receiveAsset(address asset, uint256 amount) private {
        if (asset == address(0)) {
            if (msg.value != amount) revert NativeValueMismatch();
            return;
        }
        if (msg.value != 0) revert UnexpectedNativeValue();

        IERC20 token = IERC20(asset);
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 afterBalance = token.balanceOf(address(this));
        if (afterBalance < beforeBalance || afterBalance - beforeBalance != amount) {
            revert InexactTokenSettlement();
        }
    }

    function _sendAsset(address to, address asset, uint256 amount) private {
        if (asset == address(0)) {
            (bool sent,) = to.call{value: amount}("");
            if (!sent) revert NativeTransferFailed();
            return;
        }

        IERC20 token = IERC20(asset);
        uint256 beforeBalance = token.balanceOf(to);
        uint256 beforeLedgerBalance = token.balanceOf(address(this));
        token.safeTransfer(to, amount);
        uint256 afterBalance = token.balanceOf(to);
        uint256 afterLedgerBalance = token.balanceOf(address(this));
        // Recipient-exact tokens can charge an extra fee to the sending contract.
        if (
            afterBalance < beforeBalance || afterBalance - beforeBalance != amount
                || afterLedgerBalance > beforeLedgerBalance
                || beforeLedgerBalance - afterLedgerBalance != amount
        ) {
            revert InexactTokenSettlement();
        }
    }
}
