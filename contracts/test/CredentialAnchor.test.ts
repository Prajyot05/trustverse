import { expect } from "chai";
import { ethers } from "hardhat";

describe("CredentialAnchor", function () {
  let registry: any;
  let anchor: any;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    
    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    registry = await IssuerRegistry.deploy(owner.address);
    
    const CredentialAnchor = await ethers.getContractFactory("CredentialAnchor");
    anchor = await CredentialAnchor.deploy(await registry.getAddress());

    await registry.registerIssuer("did:ethr:123", owner.address, "QmHash");
  });

  describe("Anchoring", function () {
    it("Should anchor a single credential", async function () {
      const hash = ethers.id("cred1");
      const poseidon = ethers.id("pos1");
      
      await anchor.anchorCredential(hash, poseidon, "did:ethr:123", ethers.ZeroHash);
      
      const isAnchored = await anchor.isAnchored(hash);
      expect(isAnchored).to.be.true;

      const data = await anchor.getAnchor(hash);
      expect(data.credentialHash).to.equal(hash);
      expect(data.poseidonCommitment).to.equal(poseidon);
      expect(data.issuerDID).to.equal("did:ethr:123");
    });

    it("Should fail if issuer is not active", async function () {
      await registry.suspendIssuer("did:ethr:123");
      const hash = ethers.id("cred1");
      const poseidon = ethers.id("pos1");
      
      await expect(
        anchor.anchorCredential(hash, poseidon, "did:ethr:123", ethers.ZeroHash)
      ).to.be.revertedWith("Issuer is not active");
    });

    it("Should fail if caller is not the issuer", async function () {
      const hash = ethers.id("cred1");
      const poseidon = ethers.id("pos1");
      
      await expect(
        anchor.connect(addr1).anchorCredential(hash, poseidon, "did:ethr:123", ethers.ZeroHash)
      ).to.be.revertedWith("Caller is not authorized for this DID");
    });

    it("Should batch anchor credentials", async function () {
      const hashes = [ethers.id("c1"), ethers.id("c2")];
      const poseidons = [ethers.id("p1"), ethers.id("p2")];
      const parents = [ethers.ZeroHash, ethers.ZeroHash];
      
      await anchor.batchAnchorCredentials(hashes, poseidons, "did:ethr:123", parents);
      
      expect(await anchor.isAnchored(hashes[0])).to.be.true;
      expect(await anchor.isAnchored(hashes[1])).to.be.true;
    });
  });
});
