const { expect } = require("chai");
const { deployNamed, deployReference, ethers } = require("./helpers/deploy-reference");

describe("ERCContributionProof adversarial token handling", function () {
  for (const kind of ["tip", "airdrop"]) {
    it(`rejects outgoing sender surcharge for ${kind} without consuming surplus`, async function () {
      const { alice, bob, ledger } = await deployReference();
      const token = await deployNamed("MockSenderSurchargeToken");
      const asset = await token.getAddress();
      const ledgerAddress = await ledger.getAddress();
      await token.mint(alice.address, 100n);
      await token.mint(ledgerAddress, 13n);
      await token.setTaxedSender(ledgerAddress);
      await token.approve(ledgerAddress, 7n);
      await expect(ledger[kind](bob.address, asset, 7n, 0, ethers.ZeroHash, ""))
        .to.be.revertedWithCustomError(ledger, "InexactTokenSettlement");
      expect(await token.balanceOf(ledgerAddress)).to.equal(13n);
      expect(await token.balanceOf(alice.address)).to.equal(100n);
      expect(await token.balanceOf(bob.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(113n);
      expect(await token.allowance(alice.address, ledgerAddress)).to.equal(7n);
      expect(await ledger.nextRecordId()).to.equal(1n);
      expect(await ledger.recordCountByAccount(alice.address)).to.equal(0n);
      expect(await ledger.recordCountByAccount(bob.address)).to.equal(0n);
      expect(await ledger[kind === "tip" ? "tippedOut" : "airdroppedOut"](alice.address, asset)).to.equal(0n);
      expect(await ledger[kind === "tip" ? "tippedIn" : "airdroppedIn"](bob.address, asset)).to.equal(0n);
    });
  }
  for (const tokenName of ["MockFeeOnTransferToken", "MockRebasingToken"]) {
    it(`rejects ${tokenName} when the recipient delta is not exact`, async function () {
      const { alice, bob, ledger } = await deployReference();
      const token = await deployNamed(tokenName);
      const tokenAddress = await token.getAddress();
      await token.mint(alice.address, 100n);
      await token.connect(alice).approve(await ledger.getAddress(), 100n);

      await expect(
        ledger.connect(alice).airdrop(
          bob.address,
          tokenAddress,
          100n,
          0,
          ethers.ZeroHash,
          "",
        ),
      ).to.be.reverted;

      expect(await ledger.nextRecordId()).to.equal(1n);
      expect(await ledger.airdroppedOut(alice.address, tokenAddress)).to.equal(0n);
      expect(await token.balanceOf(bob.address)).to.equal(0n);
      expect(await token.balanceOf(alice.address)).to.equal(100n);
    });
  }
});
