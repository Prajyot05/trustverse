export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const ADDRESSES = {
  issuerRegistry: process.env.NEXT_PUBLIC_ISSUER_REGISTRY_ADDRESS || '',
  credentialAnchor: process.env.NEXT_PUBLIC_ANCHOR_CONTRACT_ADDRESS || '',
  revocationRegistry: process.env.NEXT_PUBLIC_REVOCATION_CONTRACT_ADDRESS || '',
  verificationGateway: process.env.NEXT_PUBLIC_VERIFICATION_GATEWAY_ADDRESS || '',
};

export const ISSUER_REGISTRY_ABI = [
  'function selfRegister(string _did, string _metadataHash)',
  'function isIssuerActive(string _did) view returns (bool)',
  'function getIssuerDIDByAddress(address) view returns (string)',
];

export const ANCHOR_ABI = [
  'function anchorCredential(bytes32 _credentialHash, bytes32 _poseidonCommitment, string _issuerDID, bytes32 _parentHash)',
  'function isAnchored(bytes32) view returns (bool)',
];

export const GATEWAY_ABI = [
  'function verifyClaimProof(bytes32 credentialHash, uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[3] _pubSignals) returns (bool)',
  'function verifyNonRevocationProof(bytes32 credentialHash, uint256[2] _pA, uint256[2][2] _pB, uint256[2] _pC, uint256[3] _pubSignals) returns (bool)',
  'function revocationTreeRoot() view returns (uint256)',
];

export function didFromAddress(address: string) {
  return `did:ethr:${address}`;
}

export function toBytes32(hexOrHash: string): string {
  const h = hexOrHash.replace(/^0x/, '');
  return '0x' + h.padStart(64, '0');
}

export function groth16ToSolidity(proof: any, publicSignals: string[]) {
  return {
    pA: [proof.pi_a[0], proof.pi_a[1]],
    pB: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    pC: [proof.pi_c[0], proof.pi_c[1]],
    pubSignals: publicSignals,
  };
}
