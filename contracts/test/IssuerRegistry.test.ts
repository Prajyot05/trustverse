import { expect } from "chai";
import { ethers } from "hardhat";

describe("IssuerRegistry", function () {
  let registry: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    registry = await IssuerRegistry.deploy(owner.address);
  });

  describe("Registration", function () {
    it("Should register a new issuer", async function () {
      await registry.registerIssuer("did:ethr:123", addr1.address, "QmHash");
      
      const issuer = await registry.issuersByDID("did:ethr:123");
      expect(issuer.did).to.equal("did:ethr:123");
      expect(issuer.walletAddress).to.equal(addr1.address);
      expect(issuer.metadataHash).to.equal("QmHash");
      expect(issuer.isActive).to.be.true;
    });

    it("Should fail if caller is not owner", async function () {
      await expect(
        registry.connect(addr1).registerIssuer("did:ethr:123", addr1.address, "QmHash")
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should fail if DID already exists", async function () {
      await registry.registerIssuer("did:ethr:123", addr1.address, "QmHash");
      await expect(
        registry.registerIssuer("did:ethr:123", addr2.address, "QmHash2")
      ).to.be.revertedWith("Issuer already registered");
    });

    it("Should allow a university to self-register", async function () {
      await registry.connect(addr1).selfRegister("did:ethr:uni", "QmMeta");
      const issuer = await registry.issuersByDID("did:ethr:uni");
      expect(issuer.walletAddress).to.equal(addr1.address);
      expect(issuer.isActive).to.be.true;
    });
  });

  describe("Suspension and Reactivation", function () {
    beforeEach(async function () {
      await registry.registerIssuer("did:ethr:123", addr1.address, "QmHash");
    });

    it("Should suspend an active issuer", async function () {
      await registry.suspendIssuer("did:ethr:123");
      expect(await registry.isIssuerActive("did:ethr:123")).to.be.false;
    });

    it("Should reactivate a suspended issuer", async function () {
      await registry.suspendIssuer("did:ethr:123");
      await registry.reactivateIssuer("did:ethr:123");
      expect(await registry.isIssuerActive("did:ethr:123")).to.be.true;
    });
  });
});
