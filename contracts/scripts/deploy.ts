import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy IssuerRegistry
  const IssuerRegistry = await ethers.getContractFactory("IssuerRegistry");
  const issuerRegistry = await IssuerRegistry.deploy(deployer.address);
  await issuerRegistry.waitForDeployment();
  const issuerRegistryAddress = await issuerRegistry.getAddress();
  console.log("IssuerRegistry deployed to:", issuerRegistryAddress);

  // 2. Deploy CredentialAnchor
  const CredentialAnchor = await ethers.getContractFactory("CredentialAnchor");
  const credentialAnchor = await CredentialAnchor.deploy(issuerRegistryAddress);
  await credentialAnchor.waitForDeployment();
  const credentialAnchorAddress = await credentialAnchor.getAddress();
  console.log("CredentialAnchor deployed to:", credentialAnchorAddress);

  // 3. Deploy RevocationRegistry
  const RevocationRegistry = await ethers.getContractFactory("RevocationRegistry");
  const revocationRegistry = await RevocationRegistry.deploy(issuerRegistryAddress, credentialAnchorAddress);
  await revocationRegistry.waitForDeployment();
  const revocationRegistryAddress = await revocationRegistry.getAddress();
  console.log("RevocationRegistry deployed to:", revocationRegistryAddress);

  // 4. Deploy the Groth16 verifiers generated from the TrustVerse circuits
  //    (circuits/ClaimProver.circom, NonRevocation.circom, IssuerMembership.circom
  //    via circuits/scripts/build_all_circuits.sh).
  const ClaimProverVerifier = await ethers.getContractFactory("ClaimProverVerifier");
  const claimProverVerifier = await ClaimProverVerifier.deploy();
  await claimProverVerifier.waitForDeployment();
  const claimProverVerifierAddress = await claimProverVerifier.getAddress();
  console.log("ClaimProverVerifier deployed to:", claimProverVerifierAddress);

  const NonRevocationVerifier = await ethers.getContractFactory("NonRevocationVerifier");
  const nonRevocationVerifier = await NonRevocationVerifier.deploy();
  await nonRevocationVerifier.waitForDeployment();
  const nonRevocationVerifierAddress = await nonRevocationVerifier.getAddress();
  console.log("NonRevocationVerifier deployed to:", nonRevocationVerifierAddress);

  // IssuerMembershipVerifier is deployed and exercised in tests (a real
  // issuer-membership proof verifies against it), but is not routed
  // through VerificationGateway yet: doing so would require Merkleizing
  // IssuerRegistry and publishing/maintaining that root, which is out of
  // scope for the core happy path (see docs/architecture.md limitations).
  const IssuerMembershipVerifier = await ethers.getContractFactory("IssuerMembershipVerifier");
  const issuerMembershipVerifier = await IssuerMembershipVerifier.deploy();
  await issuerMembershipVerifier.waitForDeployment();
  const issuerMembershipVerifierAddress = await issuerMembershipVerifier.getAddress();
  console.log("IssuerMembershipVerifier deployed to:", issuerMembershipVerifierAddress);

  // 5. Deploy VerificationGateway
  const VerificationGateway = await ethers.getContractFactory("VerificationGateway");
  const verificationGateway = await VerificationGateway.deploy(
    claimProverVerifierAddress,
    nonRevocationVerifierAddress,
    revocationRegistryAddress,
    credentialAnchorAddress
  );
  await verificationGateway.waitForDeployment();
  const verificationGatewayAddress = await verificationGateway.getAddress();
  console.log("VerificationGateway deployed to:", verificationGatewayAddress);

  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    issuerRegistry: issuerRegistryAddress,
    credentialAnchor: credentialAnchorAddress,
    revocationRegistry: revocationRegistryAddress,
    claimProverVerifier: claimProverVerifierAddress,
    nonRevocationVerifier: nonRevocationVerifierAddress,
    issuerMembershipVerifier: issuerMembershipVerifierAddress,
    verificationGateway: verificationGatewayAddress,
  };
  const outPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log(`Wrote deployed addresses to ${outPath}`);

  console.log("Deployment complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
