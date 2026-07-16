'use client';
import Link from 'next/link';
import { useWallet } from '@/store/useWallet';
import { Shield, Wallet } from 'lucide-react';

export default function Header() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <Shield className="h-8 w-8 text-blue-500" />
          <span className="text-xl font-bold tracking-tight text-white">TrustVerse</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link href="/issuer" className="hover:text-white transition-colors">Issuer Portal</Link>
          <Link href="/wallet" className="hover:text-white transition-colors">Holder Wallet</Link>
          <Link href="/verifier" className="hover:text-white transition-colors">Verifier Dashboard</Link>
        </nav>

        <div className="flex items-center gap-4">
          {address ? (
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-gray-200">
                {`${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>
              <button 
                onClick={disconnect}
                className="text-xs text-red-400 hover:text-red-300 ml-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
