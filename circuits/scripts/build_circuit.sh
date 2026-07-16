#!/bin/bash
set -e

# Compile the circuit
echo "Compiling circuit..."
~/.cargo/bin/circom CredentialValidator.circom --r1cs --wasm --sym

# Generate trusted setup phase 1 (Powers of Tau)
echo "Running Powers of Tau..."
npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="some random text"

# Phase 2 setup
echo "Running Phase 2 setup..."
npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
npx snarkjs groth16 setup CredentialValidator.r1cs pot12_final.ptau CredentialValidator_0000.zkey

# Contribute to phase 2
echo "Contributing to Phase 2..."
npx snarkjs zkey contribute CredentialValidator_0000.zkey CredentialValidator_final.zkey --name="Second contribution" -v -e="another random text"

# Export verification key
echo "Exporting verification key..."
npx snarkjs zkey export verificationkey CredentialValidator_final.zkey verification_key.json

# Generate Solidity Verifier
echo "Generating Solidity Verifier..."
npx snarkjs zkey export solidityverifier CredentialValidator_final.zkey Verifier.sol

# Move Verifier to contracts
cp Verifier.sol ../contracts/contracts/

echo "Done!"
