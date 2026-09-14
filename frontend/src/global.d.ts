/** Minimal EIP-1193 provider shape, avoiding a cross-file import so this
 * ambient declaration file has no top-level imports/exports of its own. */
interface Eip1193ProviderLike {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

interface Window {
  ethereum?: Eip1193ProviderLike;
}

// snarkjs ships no type declarations; declare the minimal surface this app uses.
declare module "snarkjs" {
  interface Groth16ProofResult {
    proof: {
      pi_a: [string, string, string];
      pi_b: [[string, string], [string, string], [string, string]];
      pi_c: [string, string, string];
    };
    publicSignals: string[];
  }

  interface Groth16 {
    fullProve(
      input: Record<string, unknown>,
      wasmPath: string,
      zkeyPath: string
    ): Promise<Groth16ProofResult>;
  }

  export const groth16: Groth16;
}
