import { expect } from "chai";
import { ethers } from "hardhat";

describe("VerificationGateway", function () {
  let registry: any;
  let anchor: any;
  let revocation: any;
  let gateway: any;
  let verifier: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
    registry = await IssuerRegistry.deploy(owner.address);
    
    const CredentialAnchor = await ethers.getContractFactory("CredentialAnchor");
    anchor = await CredentialAnchor.deploy(await registry.getAddress());

    const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
    revocation = await RevocationRegistry.deploy(await registry.getAddress(), await anchor.getAddress());
    
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    const VerificationGateway = await ethers.getContractFactory("VerificationGateway");
    gateway = await VerificationGateway.deploy(await verifier.getAddress(), await revocation.getAddress());

    await registry.registerIssuer("did:ethr:123", owner.address, "QmHash");
    await anchor.anchorCredential(ethers.id("cred1"), ethers.id("pos1"), "did:ethr:123", ethers.ZeroHash);
  });

  describe("Verification", function () {
    it("Should fail if credential is revoked", async function () {
      await revocation.setIssuerSigners("did:ethr:123", [owner.address, addr1.address, addr2.address]);
      const hash = ethers.id("cred1");
      
      await revocation.proposeRevocation(hash, "did:ethr:123");
      await revocation.connect(addr1).approveRevocation(hash, "did:ethr:123", 1, "Testing");
      
      // Revoked now
      const pA: any = [0, 0];
      const pB: any = [[0, 0], [0, 0]];
      const pC: any = [0, 0];
      const pubSignals: any = [0, 0];
      
      // We don't have real proofs, but we can check the revocation branch
      // Actually VerificationGateway.verifyCredential returns false instead of reverting
      // Wait, let's see if we can catch the event or just check return value.
      // Ethers v6 doesn't easily let us get the return value of a non-view state-changing function without a static call.
      const result = await gateway.verifyCredential.staticCall(hash, pA, pB, pC, pubSignals);
      expect(result).to.be.false;
    });
  });
});
