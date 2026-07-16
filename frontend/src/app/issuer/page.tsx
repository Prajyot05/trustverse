'use client';
import { useWallet } from '@/store/useWallet';
import { FileBadge, Plus, Upload, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function IssuerPortal() {
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issue'>('dashboard');

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <FileBadge className="h-10 w-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Issuer Portal</h1>
          <p className="text-gray-400 text-sm">
            Connect your wallet to access the institutional dashboard and issue Verifiable Credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row items-start gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-6">
          <div className="glass-panel p-2 rounded-2xl flex flex-col">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('issue')}
              className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${activeTab === 'issue' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Issue Credential <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Issuer Profile</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">University of Tech</p>
                <p className="text-xs text-gray-400 truncate">did:ethr:{address.slice(0,6)}...{address.slice(-4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-md w-fit">
              <CheckCircle2 className="h-3 w-3" />
              Verified Institution
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'dashboard' ? (
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm">Total Issued</p>
                  <p className="text-3xl font-bold text-white mt-2">0</p>
                </div>
                <div className="glass-panel p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm">Active Schemas</p>
                  <p className="text-3xl font-bold text-white mt-2">1</p>
                </div>
                <div className="glass-panel p-6 rounded-3xl">
                  <p className="text-gray-400 text-sm">Revoked</p>
                  <p className="text-3xl font-bold text-white mt-2">0</p>
                </div>
              </div>
              
              <div className="glass-panel p-8 rounded-3xl mt-4 min-h-[300px]">
                <h3 className="text-lg font-bold text-white mb-6">Recent Issuances</h3>
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <FileBadge className="h-10 w-10 text-gray-600" />
                  <p className="text-gray-400">No credentials issued yet.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6">Issue New Credential</h2>
              
              <form className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Holder DID</label>
                  <input 
                    type="text" 
                    placeholder="did:ethr:0x..." 
                    className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Schema</label>
                  <select className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none">
                    <option value="degree">Academic Degree v1.0</option>
                  </select>
                </div>

                <div className="flex flex-col gap-4 p-5 bg-black/30 rounded-2xl border border-white/5">
                  <h4 className="text-sm font-medium text-indigo-300 mb-1">Credential Data</h4>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400">Degree Name</label>
                    <input type="text" className="bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Bachelor of Computer Science" />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400">Graduation Date</label>
                    <input type="date" className="bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-[color-scheme:dark]" />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-400">CGPA</label>
                    <input type="number" step="0.01" className="bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 3.8" />
                  </div>
                </div>

                <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl mt-4 transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                  Sign & Issue Credential
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
