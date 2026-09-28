const { expect } = require("chai");
const { deployNamed, deployReference, ethers } = require("./helpers/deploy-reference");

describe("ERCContributionProof conformance", function () {
  it("records one native Tip and advances the canonical sequence once", async function () {
    const { alice, bob, ledger } = await deployReference();
    const amount = ethers.parseEther("0.25");
    const subjectId = ethers.id("content:1");
    const before = await ethers.provider.getBalance(bob.address);

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        amount,
        6,
        subjectId,
        "ipfs://memo",
        { value: amount },
      ),
    )
      .to.emit(ledger, "ContributionRecorded")
      .withArgs(
        1n,
        0,
        alice.address,
        bob.address,
        ethers.ZeroAddress,
        amount,
        6,
        subjectId,
        "ipfs://memo",
      );

    expect(await ethers.provider.getBalance(bob.address)).to.equal(before + amount);
    expect(await ledger.tippedOut(alice.address, ethers.ZeroAddress)).to.equal(amount);
    expect(await ledger.tippedIn(bob.address, ethers.ZeroAddress)).to.equal(amount);
    expect(await ledger.recordCountByAccount(alice.address)).to.equal(1n);
    expect(await ledger.recordCountByAccount(bob.address)).to.equal(1n);
    expect(await ledger.nextRecordId()).to.equal(2n);
  });

  it("records one exact ERC-20 Airdrop", async function () {
    const { alice, bob, ledger } = await deployReference();
    const token = await deployNamed("MockExactToken");
    const amount = 1_000_000n;
    const tokenAddress = await token.getAddress();
    await token.mint(alice.address, amount);
    await token.connect(alice).approve(await ledger.getAddress(), amount);

    await expect(
      ledger.connect(alice).airdrop(
        bob.address,
        tokenAddress,
        amount,
        3,
        ethers.zeroPadValue(tokenAddress, 32),
        "",
      ),
    )
      .to.emit(ledger, "ContributionRecorded")
      .withArgs(
        1n,
        1,
        alice.address,
        bob.address,
        tokenAddress,
        amount,
        3,
        ethers.zeroPadValue(tokenAddress, 32),
        "",
      );

    expect(await token.balanceOf(bob.address)).to.equal(amount);
    expect(await ledger.airdroppedOut(alice.address, tokenAddress)).to.equal(amount);
    expect(await ledger.airdroppedIn(bob.address, tokenAddress)).to.equal(amount);
  });

  it("rejects self-transfer, zero amount, and native funding mismatch", async function () {
    const { alice, bob, ledger } = await deployReference();

    await expect(
      ledger.connect(alice).tip(
        alice.address,
        ethers.ZeroAddress,
        1n,
        0,
        ethers.ZeroHash,
        "",
        { value: 1n },
      ),
    ).to.be.reverted;
    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        0n,
        0,
        ethers.ZeroHash,
        "",
      ),
    ).to.be.reverted;
    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        2n,
        0,
        ethers.ZeroHash,
        "",
        { value: 1n },
      ),
    ).to.be.reverted;
    expect(await ledger.nextRecordId()).to.equal(1n);
  });

  it("reverts settlement, aggregates, sequence, and event when native recipient rejects", async function () {
    const { alice, ledger } = await deployReference();
    const receiver = await deployNamed("RevertingEtherReceiver");

    await expect(
      ledger.connect(alice).tip(
        await receiver.getAddress(),
        ethers.ZeroAddress,
        10n,
        0,
        ethers.ZeroHash,
        "",
        { value: 10n },
      ),
    ).to.be.reverted;

    expect(await ledger.nextRecordId()).to.equal(1n);
    expect(await ledger.recordCountByAccount(alice.address)).to.equal(0n);
  });

  it("accepts unknown subject types without changing the event layout", async function () {
    const { alice, bob, ledger } = await deployReference();

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        1n,
        255,
        ethers.id("future-subject"),
        "future",
        { value: 1n },
      ),
    ).to.emit(ledger, "ContributionRecorded");
  });

  it("requires the None subject type to use the zero subject identifier", async function () {
    const { alice, bob, ledger } = await deployReference();

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        1n,
        0,
        ethers.id("not-none"),
        "",
        { value: 1n },
      ),
    ).to.be.revertedWithCustomError(ledger, "InvalidSubject");

    expect(await ledger.nextRecordId()).to.equal(1n);
  });

  it("requires Address and Token subjects to be left-zero-padded addresses", async function () {
    const { alice, bob, ledger } = await deployReference();
    const malformed = `0x01${"00".repeat(31)}`;

    for (const subjectType of [1, 3]) {
      await expect(
        ledger.connect(alice).tip(
          bob.address,
          ethers.ZeroAddress,
          1n,
          subjectType,
          malformed,
          "",
          { value: 1n },
        ),
      ).to.be.revertedWithCustomError(ledger, "InvalidSubject");
    }

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        1n,
        3,
        ethers.zeroPadValue(bob.address, 32),
        "",
        { value: 1n },
      ),
    ).to.emit(ledger, "ContributionRecorded");
  });

  it("limits memoCid to 256 UTF-8 bytes", async function () {
    const { alice, bob, ledger } = await deployReference();

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        1n,
        0,
        ethers.ZeroHash,
        "a".repeat(256),
        { value: 1n },
      ),
    ).to.emit(ledger, "ContributionRecorded");

    await expect(
      ledger.connect(alice).tip(
        bob.address,
        ethers.ZeroAddress,
        1n,
        0,
        ethers.ZeroHash,
        `${"a".repeat(255)}中`,
        { value: 1n },
      ),
    ).to.be.revertedWithCustomError(ledger, "MemoTooLong");

    expect(await ledger.nextRecordId()).to.equal(2n);
  });

  it("reports core, extension, composite, and ERC-165 identities only", async function () {
    const { ledger } = await deployReference();

    expect(await ledger.supportsInterface("0x01ffc9a7")).to.equal(true);
    expect(await ledger.supportsInterface("0xa89decef")).to.equal(true);
    expect(await ledger.supportsInterface("0x1ac292fe")).to.equal(true);
    expect(await ledger.supportsInterface("0xb25f7e11")).to.equal(true);
    expect(await ledger.supportsInterface("0x716d3dcb")).to.equal(false);
    expect(await ledger.supportsInterface("0xffffffff")).to.equal(false);
  });
});
