import Link from 'next/link';
import { Shield, Fingerprint, Activity, Network } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
        TrustVerse Alpha Live
      </div>
      
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl">
        The Immutable Layer of <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
          Digital Trust
        </span>
      </h1>
      
      <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12">
        Verify authenticity, detect forgery, and prove credential ownership using Zero-Knowledge proofs and AI forensics on the blockchain.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-24">
        <Link href="/issuer" className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          Become an Issuer
        </Link>
        <Link href="/wallet" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-3 rounded-full font-bold transition-all">
          Access Wallet
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="glass-panel p-8 rounded-3xl text-left flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform">
          <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 text-blue-400">
            <Fingerprint className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Cryptographic Identity</h3>
          <p className="text-sm text-gray-400">W3C DIDs and verifiable credentials ensure self-sovereign control over your digital documents.</p>
        </div>
        
        <div className="glass-panel p-8 rounded-3xl text-left flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform">
          <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30 text-purple-400">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">Zero-Knowledge Proofs</h3>
          <p className="text-sm text-gray-400">Prove attributes without revealing the underlying data. Complete privacy through mathematics.</p>
        </div>

        <div className="glass-panel p-8 rounded-3xl text-left flex flex-col items-start gap-4 hover:-translate-y-1 transition-transform">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">AI Forgery Detection</h3>
          <p className="text-sm text-gray-400">Deepfake detection and document tampering analysis embedded natively into verification.</p>
        </div>
      </div>
    </div>
  );
}
