#!/bin/bash
set -e

mkdir -p build
mkdir -p ../contracts/contracts/verifiers

# Generate trusted setup phase 1 (Powers of Tau)
if [ ! -f "pot12_final.ptau" ]; then
    echo "Running Powers of Tau (Phase 1)..."
    npx snarkjs powersoftau new bn128 14 pot12_0000.ptau -v
    npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="random text"
    npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
fi

circuits=("ClaimProver" "IssuerMembership" "NonRevocation" "VisualBinder")

for circuit in "${circuits[@]}"; do
    echo "----------------------------------------"
    echo "Building $circuit..."
    echo "----------------------------------------"
    
    # Compile the circuit
    ~/.cargo/bin/circom $circuit.circom --r1cs --wasm --sym -o build/
    
    # Phase 2 setup
    echo "Running Phase 2 setup for $circuit..."
    npx snarkjs groth16 setup build/$circuit.r1cs pot12_final.ptau build/${circuit}_0000.zkey
    
    # Contribute to phase 2
    echo "Contributing to Phase 2 for $circuit..."
    npx snarkjs zkey contribute build/${circuit}_0000.zkey build/${circuit}_final.zkey --name="Second contribution" -v -e="another random text"
    
    # Export verification key
    echo "Exporting verification key for $circuit..."
    npx snarkjs zkey export verificationkey build/${circuit}_final.zkey build/${circuit}_vkey.json
    
    # Generate Solidity Verifier
    echo "Generating Solidity Verifier for $circuit..."
    npx snarkjs zkey export solidityverifier build/${circuit}_final.zkey build/${circuit}Verifier.sol
    
    # Update contract name in Solidity Verifier
    sed -i '' "s/contract Groth16Verifier/contract ${circuit}Verifier/g" build/${circuit}Verifier.sol
    
    # Move Verifier to contracts
    cp build/${circuit}Verifier.sol ../contracts/contracts/verifiers/
done

echo "----------------------------------------"
echo "Done building all circuits!"
