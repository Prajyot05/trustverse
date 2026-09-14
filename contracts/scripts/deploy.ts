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

  // 4. Deploy Groth16 Verifier (Generated from SnarkJS)
  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  const groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();
  const groth16VerifierAddress = await groth16Verifier.getAddress();
  console.log("Groth16Verifier deployed to:", groth16VerifierAddress);

  // 5. Deploy VerificationGateway
  const VerificationGateway = await ethers.getContractFactory("VerificationGateway");
  const verificationGateway = await VerificationGateway.deploy(groth16VerifierAddress, revocationRegistryAddress);
  await verificationGateway.waitForDeployment();
  const verificationGatewayAddress = await verificationGateway.getAddress();
  console.log("VerificationGateway deployed to:", verificationGatewayAddress);

  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: deployer.address,
    issuerRegistry: issuerRegistryAddress,
    credentialAnchor: credentialAnchorAddress,
    revocationRegistry: revocationRegistryAddress,
    groth16Verifier: groth16VerifierAddress,
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
