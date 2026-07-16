import { create } from 'zustand';
import { BrowserProvider, Signer } from 'ethers';

interface WalletState {
  address: string | null;
  signer: Signer | null;
  provider: BrowserProvider | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWallet = create<WalletState>((set) => ({
  address: null,
  signer: null,
  provider: null,
  isConnecting: false,
  connect: async () => {
    set({ isConnecting: true });
    try {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        set({ address, signer, provider, isConnecting: false });
      } else {
        alert("Please install MetaMask!");
        set({ isConnecting: false });
      }
    } catch (err) {
      console.error(err);
      set({ isConnecting: false });
    }
  },
  disconnect: () => set({ address: null, signer: null, provider: null })
}));
