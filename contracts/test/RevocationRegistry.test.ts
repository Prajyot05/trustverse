import { expect } from "chai";
import { ethers } from "hardhat";

describe("RevocationRegistry", function () {
  let registry: any;
  let anchor: any;
  let revocation: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    registry = await IssuerRegistry.deploy(owner.address);
    
    const CredentialAnchor = await ethers.getContractFactory("CredentialAnchor");
    anchor = await CredentialAnchor.deploy(await registry.getAddress());

    const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
    revocation = await RevocationRegistry.deploy(await registry.getAddress(), await anchor.getAddress());

    await registry.registerIssuer("did:ethr:123", owner.address, "QmHash");
    await anchor.anchorCredential(ethers.id("cred1"), ethers.id("pos1"), "did:ethr:123", ethers.ZeroHash);
  });

  describe("Revocation Flow", function () {
    it("Should set signers correctly", async function () {
      await revocation.setIssuerSigners("did:ethr:123", [owner.address, addr1.address, addr2.address]);
      expect(await revocation.isSigner("did:ethr:123", addr1.address)).to.be.true;
      expect(await revocation.isSigner("did:ethr:123", addr3.address)).to.be.false;
    });

    it("Should require multiple approvals for revocation", async function () {
      await revocation.setIssuerSigners("did:ethr:123", [owner.address, addr1.address, addr2.address]);
      
      const hash = ethers.id("cred1");
      
      // Propose
      await revocation.proposeRevocation(hash, "did:ethr:123");
      expect(await revocation.revocationApprovalCounts(hash)).to.equal(1);
      expect(await revocation.isRevoked(hash)).to.be.false;

      // Approve
      await revocation.connect(addr1).approveRevocation(hash, "did:ethr:123", 1, "Administrative");
      expect(await revocation.revocationApprovalCounts(hash)).to.equal(2);
      expect(await revocation.isRevoked(hash)).to.be.true;
    });
  });
});
