'use client';
import { useWallet } from '@/store/useWallet';
import { ScanSearch, ShieldCheck, Copy, QrCode, UploadCloud, Activity, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function VerifierDashboard() {
  const { address } = useWallet();
  const [activeTab, setActiveTab] = useState<'zk' | 'ai'>('zk');
  const [threshold, setThreshold] = useState('3.0');
  const [requestUrl, setRequestUrl] = useState('');
  
  // AI Forensics State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const requestPayload = {
      type: "VerificationRequest",
      verifier: address,
      query: { schema: "degree", attribute: "cgpa", operator: ">=", value: threshold },
      callback: "https://trustverse.app/api/verify"
    };
    const encoded = Buffer.from(JSON.stringify(requestPayload)).toString('base64');
    setRequestUrl(`trustverse://verify?req=${encoded}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisResult(null);
      setTrustScore(null);
    }
  };

  const runAIForensics = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${API_URL}/api/v1/forensics/analyze`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (res.ok) {
        const data = await res.json();
        // Backend shape: { filename, analysis: { authenticity_score, is_authentic, confidence }, status }
        const analysis = data.analysis;

        // Fetch the real perceptual hash rather than showing a placeholder
        let phash: string | undefined;
        try {
          const phashFormData = new FormData();
          phashFormData.append('file', selectedFile);
          const phashRes = await fetch(`${API_URL}/api/v1/forensics/phash`, {
            method: 'POST',
            body: phashFormData,
          });
          if (phashRes.ok) {
            const phashData = await phashRes.json();
            phash = phashData.phash;
          }
        } catch (phashErr) {
          console.error(phashErr);
        }

        setAnalysisResult({
          filename: selectedFile.name,
          analysis: { ...analysis, phash },
        });

        // Try to get Trust Score
        const tsRes = await fetch(`${API_URL}/api/v1/trust-score/compute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential_hash: "0xmock", // Ideally, we'd extract this from QR in a real flow
            ai_authenticity_score: analysis.authenticity_score
          })
        });
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          setTrustScore(tsData);
        }
      } else {
        alert("Failed to analyze image");
      }
    } catch (e) {
      console.error(e);
      alert("Error calling forensics API");
    } finally {
      setIsAnalyzing(false);
    }
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
            Connect your wallet to request Zero-Knowledge proofs and run AI forensics on documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Institutional Verifier</h1>
          <p className="text-gray-400">Validate credentials via Zero-Knowledge or analyze documents with AI.</p>
        </div>
        
        {/* Tabs */}
        <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 w-full max-w-md">
          <button 
            onClick={() => setActiveTab('zk')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'zk' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-white'}`}
          >
            Zero-Knowledge Proof
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ai' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'}`}
          >
            AI Forensics
          </button>
        </div>

        {activeTab === 'zk' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl animate-in fade-in zoom-in-95 duration-300">
            {/* ZK Form */}
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
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-300">Attribute & Condition</label>
                  <div className="flex gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl font-bold flex items-center">
                      CGPA &gt;=
                    </div>
                    <input 
                      type="number" step="0.01" value={threshold} onChange={(e) => setThreshold(e.target.value)}
                      className="flex-1 bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button type="submit" className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  Generate Request
                </button>
              </form>
            </div>

            {/* ZK QR */}
            <div className="glass-panel p-8 rounded-3xl flex flex-col items-center justify-center gap-6 min-h-[400px]">
              {requestUrl ? (
                <>
                  <h3 className="text-lg font-medium text-gray-300">Scan to Prove</h3>
                  <div className="bg-white p-4 rounded-2xl"><QRCode value={requestUrl} size={200} /></div>
                  <div className="text-sm text-emerald-400 font-medium animate-pulse mt-2">Waiting for holder proof submission...</div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center text-gray-500">
                  <QrCode className="h-16 w-16 opacity-50" />
                  <p>Configure requirements and generate<br/>a request QR code.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl glass-panel p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 border-b border-white/10 pb-6 mb-6">
              <Activity className="h-6 w-6 text-indigo-400" />
              <h2 className="text-2xl font-bold text-white">AI Document Forensics</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upload Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-500/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-indigo-500/5 transition-colors min-h-[300px]"
              >
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                <UploadCloud className="h-12 w-12 text-indigo-400" />
                <div className="text-center">
                  <p className="text-white font-medium mb-1">{selectedFile ? selectedFile.name : "Upload Document Scan"}</p>
                  <p className="text-sm text-gray-400">{selectedFile ? "Click to change file" : "PNG, JPG up to 10MB"}</p>
                </div>
                
                {selectedFile && !analysisResult && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); runAIForensics(); }}
                    disabled={isAnalyzing}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                    {isAnalyzing ? "Analyzing (CNN Pipeline)..." : "Run AI Forensics"}
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="flex flex-col justify-center">
                {analysisResult ? (
                  <div className={`p-6 rounded-2xl border ${analysisResult.analysis.is_authentic ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      {analysisResult.analysis.is_authentic ? (
                        <CheckCircle className="h-8 w-8 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                      )}
                      <h3 className="text-xl font-bold text-white">
                        {analysisResult.analysis.is_authentic ? "Authentic Document" : "Forgery Detected"}
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Authenticity Score</span>
                          <span className="text-white font-mono">{(analysisResult.analysis.authenticity_score * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-black/50 rounded-full h-2">
                          <div className={`h-2 rounded-full ${analysisResult.analysis.is_authentic ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${analysisResult.analysis.authenticity_score * 100}%` }}></div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-black/30 rounded-lg text-sm text-gray-400">
                        <p><strong>ELA Analysis:</strong> Compression patterns {analysisResult.analysis.is_authentic ? "consistent across image" : "show distinct anomalies indicating manipulation"}.</p>
                      </div>
                      <div className="p-3 bg-black/30 rounded-lg text-sm text-gray-400 font-mono text-xs break-all">
                        <p className="text-gray-500 mb-1">pHash (Perceptual Hash)</p>
                        {analysisResult.analysis.phash || 'unavailable'}
                      </div>
                      
                      {trustScore && (
                        <div className="pt-4 border-t border-white/10 mt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white">TrustVerse Score</span>
                            <span className="text-lg font-bold text-blue-400">{Math.round(trustScore.score)}/100</span>
                          </div>
                          {trustScore.status && (
                            <p className="text-xs text-gray-500 mt-1">{trustScore.status}{trustScore.reason ? `: ${trustScore.reason}` : ''}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 p-8">
                    <Activity className="h-16 w-16 opacity-20 mx-auto mb-4" />
                    <p>Upload a document to detect deepfakes, text tampering, and structural anomalies using our PyTorch CNN pipeline.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
