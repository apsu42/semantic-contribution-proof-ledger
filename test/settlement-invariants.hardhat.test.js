const { expect } = require("chai");
const { deployNamed, deployReference, ethers } = require("./helpers/deploy-reference");

describe("ERCContributionProof settlement invariants", function () {
  it("emits exactly one proof and changes only the selected kind aggregates", async function () {
    const { alice, bob, ledger } = await deployReference();
    const tx = await ledger.connect(alice).tip(
      bob.address,
      ethers.ZeroAddress,
      7n,
      0,
      ethers.ZeroHash,
      "",
      { value: 7n },
    );
    const receipt = await tx.wait();
    const proofs = receipt.logs
      .map((log) => {
        try { return ledger.interface.parseLog(log); } catch { return null; }
      })
      .filter((log) => log?.name === "ContributionRecorded");

    expect(proofs).to.have.length(1);
    expect(await ledger.tippedOut(alice.address, ethers.ZeroAddress)).to.equal(7n);
    expect(await ledger.airdroppedOut(alice.address, ethers.ZeroAddress)).to.equal(0n);
  });

  it("rejects unexpected native value on an ERC-20 action atomically", async function () {
    const { alice, bob, ledger } = await deployReference();
    const token = await deployNamed("MockExactToken");
    const tokenAddress = await token.getAddress();
    await token.mint(alice.address, 5n);
    await token.connect(alice).approve(await ledger.getAddress(), 5n);

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        tokenAddress,
        5n,
        0,
        ethers.ZeroHash,
        "",
        { value: 1n },
      ),
    ).to.be.reverted;

    expect(await ledger.nextRecordId()).to.equal(1n);
    expect(await token.balanceOf(bob.address)).to.equal(0n);
  });
});
