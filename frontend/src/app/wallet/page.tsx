'use client';
import { useWallet } from '@/store/useWallet';
import { ShieldCheck, Wallet as WalletIcon, Lock, Key } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState } from 'react';

export default function WalletPage() {
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<'credentials' | 'requests'>('credentials');

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <WalletIcon className="h-10 w-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Access Wallet</h1>
          <p className="text-gray-400 text-sm">
            Connect your Web3 wallet to manage your verifiable credentials and cryptographic identity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row items-start gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-3xl flex flex-col items-center gap-4 text-center">
            <div className="bg-white p-3 rounded-2xl w-48 h-48 flex items-center justify-center">
              <QRCode value={`did:ethr:${address}`} size={160} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">My Decentralized ID</h2>
              <p className="text-xs text-gray-400 mt-2 break-all bg-black/40 p-2 rounded-lg font-mono">
                did:ethr:{address}
              </p>
            </div>
          </div>

          <div className="glass-panel p-2 rounded-2xl flex flex-col">
            <button 
              onClick={() => setActiveTab('credentials')}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'credentials' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              My Credentials
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'requests' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Verification Requests
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 glass-panel rounded-3xl p-8 min-h-[600px]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {activeTab === 'credentials' ? 'Verifiable Credentials' : 'Verification Requests'}
            </h2>
            {activeTab === 'credentials' && (
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30">
                0 Total
              </span>
            )}
          </div>

          {activeTab === 'credentials' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-800/50 flex items-center justify-center border border-gray-700">
                <ShieldCheck className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-300">No Credentials Yet</h3>
              <p className="text-sm text-gray-500 max-w-md">
                You haven't received any Verifiable Credentials. Once an issuer grants you one, it will appear here encrypted with your key.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-800/50 flex items-center justify-center border border-gray-700">
                <Key className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-300">No Pending Requests</h3>
              <p className="text-sm text-gray-500 max-w-md">
                Verifiers can request access to your credentials using Zero-Knowledge proofs. Any incoming requests will be listed here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
