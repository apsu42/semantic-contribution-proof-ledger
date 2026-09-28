const { expect } = require("chai");
const { ethers } = require("hardhat");

async function factoryOrNull(name) {
  try {
    return await ethers.getContractFactory(name);
  } catch (error) {
    if (String(error?.message).includes("HH700")) return null;
    throw error;
  }
}

async function deployReference() {
  const [alice, bob, carol] = await ethers.getSigners();
  const Ledger = await factoryOrNull("ERCContributionProof");
  expect(Ledger, "ERCContributionProof reference implementation is missing").not.to.equal(null);
  const ledger = await Ledger.deploy();
  await ledger.waitForDeployment();
  return { alice, bob, carol, ledger };
}

async function deployNamed(name, ...args) {
  const Factory = await factoryOrNull(name);
  expect(Factory, `${name} test contract is missing`).not.to.equal(null);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

module.exports = { deployNamed, deployReference, ethers };
