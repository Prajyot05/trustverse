'use client';
import { useWallet } from '@/store/useWallet';
import { ScanSearch, ShieldCheck, QrCode, UploadCloud, Activity, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState, useEffect, useRef } from 'react';
import { API_URL, didFromAddress } from '@/lib/contracts';

export default function VerifierDashboard() {
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<'zk' | 'ai'>('zk');
  const [threshold, setThreshold] = useState('8.0');
  const [holderDid, setHolderDid] = useState('');
  const [issuerDid, setIssuerDid] = useState('');
  const [request, setRequest] = useState<any>(null);
  const [pollStatus, setPollStatus] = useState<any>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request?.id) return;
    const id = setInterval(async () => {
      const res = await fetch(`${API_URL}/api/v1/verify/requests/${request.id}`);
      if (res.ok) setPollStatus(await res.json());
    }, 3000);
    return () => clearInterval(id);
  }, [request?.id]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const res = await fetch(`${API_URL}/api/v1/verify/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verifier_did: didFromAddress(address),
        holder_did: holderDid || undefined,
        issuer_did: issuerDid || undefined,
        attribute: 'cgpa',
        threshold: parseFloat(threshold),
      }),
    });
    if (res.ok) setRequest(await res.json());
    else alert((await res.json()).detail || 'Failed to create request');
  };

  const runAIForensics = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${API_URL}/api/v1/forensics/analyze`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      const analysis = data.analysis;
      setAnalysisResult({ filename: selectedFile.name, analysis });
      const tsRes = await fetch(`${API_URL}/api/v1/trust-score/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential_hash: '0x0', ai_authenticity_score: analysis.authenticity_score }),
      });
      if (tsRes.ok) setTrustScore(await tsRes.json());
    } catch (e) {
      console.error(e);
      alert('Forensics failed — ensure CNN weights are trained.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ScanSearch className="h-10 w-10 text-emerald-400 mb-4" />
        <h1 className="text-3xl font-bold text-white">Verifier Portal</h1>
        <p className="text-gray-400 text-sm mt-2">Connect wallet to request ZK proofs or run AI forensics.</p>
      </div>
    );
  }

  const walletUrl = request ? `${typeof window !== 'undefined' ? window.location.origin : ''}${request.wallet_deep_link}` : '';

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 w-full max-w-md mx-auto mb-8">
        <button onClick={() => setActiveTab('zk')} className={`flex-1 py-2 rounded-lg text-sm ${activeTab === 'zk' ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400'}`}>Zero-Knowledge</button>
        <button onClick={() => setActiveTab('ai')} className={`flex-1 py-2 rounded-lg text-sm ${activeTab === 'ai' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400'}`}>AI Forensics</button>
      </div>

      {activeTab === 'zk' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="glass-panel p-8 rounded-3xl">
            <h2 className="text-xl font-bold text-white mb-4">Proof Request</h2>
            <form onSubmit={handleCreateRequest} className="flex flex-col gap-4">
              <input placeholder="Holder DID (optional)" value={holderDid} onChange={(e) => setHolderDid(e.target.value)} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
              <input placeholder="Issuer DID (optional)" value={issuerDid} onChange={(e) => setIssuerDid(e.target.value)} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
              <label className="text-sm text-gray-300">CGPA &gt;=</label>
              <input type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl">Create request</button>
            </form>
          </div>
          <div className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-4 min-h-[320px]">
            {request ? (
              <>
                <p className="text-gray-300">Request #{request.id} — share with holder</p>
                <QRCode value={walletUrl} size={180} />
                <p className="text-xs text-gray-500 break-all">{walletUrl}</p>
                {pollStatus?.status === 'fulfilled' ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-sm">
                    <p className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Verified</p>
                    <p className="text-gray-400 mt-2">Block: {pollStatus.block_number}</p>
                    <p className="text-gray-400">Claim tx: {pollStatus.claim_tx_hash?.slice(0, 18)}…</p>
                    <p className="text-gray-300 mt-3 border-t border-white/10 pt-3">No attribute values were disclosed — only that the threshold holds and the credential is not revoked.</p>
                  </div>
                ) : (
                  <p className="text-emerald-400 animate-pulse text-sm">Waiting for holder proof…</p>
                )}
              </>
            ) : (
              <div className="text-gray-500 text-center flex flex-col items-center gap-3 mt-12">
                <QrCode className="h-12 w-12 opacity-40" />
                <p>Create a request to get a wallet deep link.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto glass-panel p-8 rounded-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer min-h-[280px]">
              <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setSelectedFile(e.target.files[0]); setAnalysisResult(null); } }} />
              <UploadCloud className="h-10 w-10 text-indigo-400 mb-3" />
              <p className="text-white">{selectedFile?.name || 'Upload legacy scan'}</p>
              {selectedFile && !analysisResult && (
                <button onClick={(e) => { e.stopPropagation(); runAIForensics(); }} disabled={isAnalyzing} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl flex gap-2">
                  {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />} Run forensics
                </button>
              )}
            </div>
            <div>
              {analysisResult ? (
                <div className={`p-6 rounded-2xl border ${analysisResult.analysis.is_authentic ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                  <h3 className="text-white font-bold mb-2">{analysisResult.analysis.is_authentic ? 'Likely authentic' : 'Forgery suspected'}</h3>
                  <p className="text-sm text-gray-300 mb-2">Score: {(analysisResult.analysis.authenticity_score * 100).toFixed(1)}%</p>
                  {analysisResult.analysis.ela_heatmap && (
                    <img src={analysisResult.analysis.ela_heatmap} alt="ELA heatmap" className="rounded-lg border border-white/10 w-full mb-3" />
                  )}
                  <p className="text-xs font-mono text-gray-400">pHash: {analysisResult.analysis.phash}</p>
                  {trustScore && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-white font-bold">TrustVerse Score: {Math.round(trustScore.score)}/100</p>
                      {trustScore.components && (
                        <ul className="text-xs text-gray-400 mt-2 space-y-1">
                          <li>AI: {trustScore.components.ai_points}</li>
                          <li>Issuer: {trustScore.components.issuer_points}</li>
                          <li>On-chain: {trustScore.components.onchain_points}</li>
                          <li>Lineage: {trustScore.components.lineage_points}</li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-12">Upload a scanned certificate for ELA + CNN analysis.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
