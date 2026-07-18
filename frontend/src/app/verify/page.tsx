'use client';
import { Search, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PublicVerifyPage() {
  const [hash, setHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash) return;
    setIsVerifying(true);
    setResult(null);

    try {
      // In a real flow, this could take the raw hash directly, but we add 0x if missing
      const formattedHash = hash.startsWith('0x') ? hash : `0x${hash}`;
      const res = await fetch(`${API_URL}/api/v1/verify/${formattedHash}`);
      
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const errorData = await res.json();
        setResult({ is_valid: false, reason: errorData.detail || 'Verification failed', data: null });
      }
    } catch (e) {
      console.error(e);
      setResult({ is_valid: false, reason: 'Network error connecting to verification node', data: null });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl min-h-[80vh] flex flex-col items-center">
      <div className="text-center mb-10 w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          Public Credential Verification
        </h1>
        <p className="text-gray-400 text-lg">
          Verify the authenticity and blockchain anchoring of any TrustVerse credential.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <form onSubmit={handleVerify} className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-gray-500" />
          </div>
          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Enter Credential Hash (e.g., 0xabc123...)"
            className="w-full bg-black/60 border-2 border-gray-800 rounded-2xl py-4 pl-14 pr-32 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-all text-lg shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          />
          <button
            type="submit"
            disabled={isVerifying || !hash}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
          </button>
        </form>

        {result && (
          <div className={`mt-8 p-8 rounded-3xl border animate-in fade-in slide-in-from-bottom-4 ${result.is_valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              {result.is_valid ? (
                <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-8 w-8 text-emerald-400" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
              )}
              
              <div>
                <h2 className={`text-2xl font-bold ${result.is_valid ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.is_valid ? 'Valid Credential' : 'Verification Failed'}
                </h2>
                <p className="text-gray-300">{result.reason}</p>
              </div>
            </div>

            {result.data && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">On-Chain Anchor Data</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Issuer DID</p>
                    <p className="text-sm text-white font-mono truncate">{result.data.issuerDID}</p>
                  </div>
                  
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-gray-500 mb-1">Anchored Timestamp</p>
                    <p className="text-sm text-white">
                      {new Date(result.data.anchoredAt * 1000).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Poseidon Commitment (ZK Anchor)</p>
                    <p className="text-sm text-white font-mono break-all">{result.data.poseidonCommitment}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!result.data && !result.is_valid && (
              <div className="bg-black/40 p-6 rounded-xl border border-white/5 text-center mt-4">
                <p className="text-gray-400">This hash does not exist on the TrustVerse anchor registry. It may be invalid, from an unverified issuer, or tampered with.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
