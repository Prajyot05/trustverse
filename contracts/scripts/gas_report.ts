/**
 * Gas report for anchor, revocation root update, and gateway verification.
 * Run: cd contracts && npx hardhat run scripts/gas_report.ts --network localhost
 */
import fs from "fs";
import path from "path";
import { ethers } from "hardhat";

const OUT = path.join(__dirname, "..", "..", "eval", "out", "gas_metrics.json");

async function main() {
  const addrs = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployed-addresses.json"), "utf8")
  );
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("IssuerRegistry", addrs.issuerRegistry);
  const anchor = await ethers.getContractAt("CredentialAnchor", addrs.credentialAnchor);
  const gateway = await ethers.getContractAt("VerificationGateway", addrs.verificationGateway);

  const fixtures = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "..", "circuits", "fixtures", "fixtures.json"), "utf8")
  );
  const claim = fixtures.claimProver.solidityCalldata;
  const nonRev = fixtures.nonRevocation.solidityCalldata;

  const credHash = ethers.id("eval-gas-cred");
  const poseidon =
    "0x" + BigInt(fixtures.claimProver.publicSignals[1]).toString(16).padStart(64, "0");

  await registry.registerIssuer("did:example:uni", deployer.address, "QmEval");
  const anchorTx = await anchor.anchorCredential(credHash, poseidon, "did:example:uni", ethers.ZeroHash);
  const anchorRcpt = await anchorTx.wait();

  const revRoot = nonRev.pubSignals[2];
  const revTx = await gateway.updateRevocationTreeRoot(revRoot);
  const revRcpt = await revTx.wait();

  const verifyTx = await gateway.verifyClaimProof(credHash, claim.pA, claim.pB, claim.pC, claim.pubSignals);
  const verifyRcpt = await verifyTx.wait();

  const nonRevTx = await gateway.verifyNonRevocationProof(
    credHash,
    nonRev.pA,
    nonRev.pB,
    nonRev.pC,
    nonRev.pubSignals
  );
  const nonRevRcpt = await nonRevTx.wait();

  const report = {
    network: "localhost",
    deployer: deployer.address,
    anchorCredential_gas: anchorRcpt?.gasUsed?.toString(),
    updateRevocationTreeRoot_gas: revRcpt?.gasUsed?.toString(),
    verifyClaimProof_gas: verifyRcpt?.gasUsed?.toString(),
    verifyNonRevocationProof_gas: nonRevRcpt?.gasUsed?.toString(),
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
