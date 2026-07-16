'use client';
import { useWallet } from '@/store/useWallet';
import { ScanSearch, ShieldCheck, Copy, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState } from 'react';

export default function VerifierDashboard() {
  const { address } = useWallet();
  const [threshold, setThreshold] = useState('3.0');
  const [requestUrl, setRequestUrl] = useState('');

  const handleGenerateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a deep link to the wallet app with the verification request payload
    // Here we generate a mock JSON-RPC or deep link request
    const requestPayload = {
      type: "VerificationRequest",
      verifier: address,
      query: {
        schema: "degree",
        attribute: "cgpa",
        operator: ">=",
        value: threshold
      },
      callback: "https://trustverse.app/api/verify"
    };
    
    const encoded = Buffer.from(JSON.stringify(requestPayload)).toString('base64');
    setRequestUrl(`trustverse://verify?req=${encoded}`);
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <ScanSearch className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Verifier Portal</h1>
          <p className="text-gray-400 text-sm">
            Connect your wallet to request Zero-Knowledge proofs from credential holders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Request Verification</h1>
          <p className="text-gray-400">Configure ZK proof requirements without seeing the underlying data.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Configuration Form */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Proof Configuration</h2>
            </div>
            
            <form onSubmit={handleGenerateRequest} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Target Schema</label>
                <select className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none">
                  <option value="degree">Academic Degree v1.0</option>
                  <option value="kyc">KYC Identity v2.0</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Attribute</label>
                <select className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 appearance-none">
                  <option value="cgpa">CGPA (Cumulative Grade Point Average)</option>
                  <option value="age">Age</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-300">Condition</label>
                <div className="flex gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl w-24 text-center font-bold">
                    &gt;=
                  </div>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="flex-1 bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 3.0" 
                  />
                </div>
              </div>

              <button type="submit" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                Generate Request
              </button>
            </form>
          </div>

          {/* QR Code Output */}
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center gap-6 min-h-[400px]">
            {requestUrl ? (
              <>
                <h3 className="text-lg font-medium text-gray-300">Scan to Prove</h3>
                <div className="bg-white p-4 rounded-2xl">
                  <QRCode value={requestUrl} size={200} />
                </div>
                <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-lg border border-white/5 w-full">
                  <p className="text-xs text-gray-400 font-mono truncate flex-1">{requestUrl}</p>
                  <button className="text-gray-400 hover:text-white" onClick={() => navigator.clipboard.writeText(requestUrl)}>
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-emerald-400 font-medium animate-pulse mt-2">
                  Waiting for holder proof submission...
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center text-gray-500">
                <QrCode className="h-16 w-16 opacity-50" />
                <p>Configure requirements and generate<br/>a request QR code.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
