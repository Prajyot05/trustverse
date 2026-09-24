/** Expected chain for live local / testnet. Default Hardhat. */
export const EXPECTED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

export const HARDHAT_NETWORK = {
  chainId: "0x7a69",
  chainName: "Hardhat Local",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"],
};

export function hexChainId(id: number) {
  return "0x" + id.toString(16);
}

export async function switchToExpectedChain(): Promise<void> {
  const ethereum = window.ethereum;
  if (!ethereum?.request) throw new Error("MetaMask not found");
  const chainId = hexChainId(EXPECTED_CHAIN_ID);
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [HARDHAT_NETWORK],
      });
      return;
    }
    throw err;
  }
}

export function chainLabel(chainId: number | null): string {
  if (chainId === 31337) return "Hardhat Local";
  if (chainId === 11155111) return "Sepolia";
  if (chainId === 1) return "Ethereum";
  if (!chainId) return "Unknown network";
  return `Chain ${chainId}`;
}
