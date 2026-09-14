'use client';
import { useWallet } from '@/store/useWallet';
import { FileBadge, Plus, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Contract, ethers } from 'ethers';
import {
  API_URL,
  ADDRESSES,
  ISSUER_REGISTRY_ABI,
  ANCHOR_ABI,
  didFromAddress,
  toBytes32,
} from '@/lib/contracts';

export default function IssuerPortal() {
  const { address, provider, signer } = useWallet();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'issue' | 'register'>('dashboard');
  const [isIssuing, setIsIssuing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [issuerProfile, setIssuerProfile] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [institutionName, setInstitutionName] = useState('TrustVerse University');

  const [formData, setFormData] = useState({
    holderDid: '',
    degreeName: '',
    graduationDate: '',
    cgpa: '',
  });

  const issuerDid = address ? didFromAddress(address) : '';

  const fetchCredentials = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/credentials/issuer/${encodeURIComponent(issuerDid)}`);
      if (res.ok) setCredentials(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfile = async () => {
    if (!address) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/issuers/${encodeURIComponent(issuerDid)}`);
      if (res.ok) setIssuerProfile(await res.json());
      else setIssuerProfile(null);
    } catch {
      setIssuerProfile(null);
    }
  };

  useEffect(() => {
    fetchCredentials();
    fetchProfile();
  }, [address]);

  const handleRegister = async () => {
    if (!signer || !address) return;
    setIsRegistering(true);
    try {
      if (!ADDRESSES.issuerRegistry) throw new Error('Contract addresses not configured');

      const registry = new Contract(ADDRESSES.issuerRegistry, ISSUER_REGISTRY_ABI, signer);
      const tx = await registry.selfRegister(issuerDid, `ipfs://trustverse/${address.slice(2, 10)}`);
      await tx.wait();

      await fetch(`${API_URL}/api/v1/issuers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did: issuerDid,
          wallet_address: address,
          name: institutionName,
          metadata_json: { type: 'university' },
        }),
      });

      await fetchProfile();
      setActiveTab('issue');
      alert('Issuer registered on-chain and in TrustVerse API.');
    } catch (e: any) {
      console.error(e);
      alert(e?.reason || e?.message || 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer || !address) return;
    setIsIssuing(true);
    try {
      const issueRes = await fetch(`${API_URL}/api/v1/credentials/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuer_did: issuerDid,
          holder_did: formData.holderDid,
          schema_id: 'degree-v1',
          credential_subject: {
            degree: formData.degreeName,
            date: formData.graduationDate,
            cgpa: parseFloat(formData.cgpa),
          },
          issuer_wallet_address: address,
        }),
      });
      if (!issueRes.ok) throw new Error((await issueRes.json()).detail || 'Issue failed');
      const issued = await issueRes.json();

      const anchor = new Contract(ADDRESSES.credentialAnchor, ANCHOR_ABI, signer);
      const credHash = toBytes32(issued.credential_hash);
      const poseidon = toBytes32(issued.poseidon_commitment);
      const tx = await anchor.anchorCredential(credHash, poseidon, issuerDid, ethers.ZeroHash);
      const receipt = await tx.wait();

      await fetch(`${API_URL}/api/v1/credentials/${issued.credential_hash}/anchored`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential_hash: issued.credential_hash, tx_hash: receipt.hash }),
      });

      alert(`Credential issued and anchored in block ${receipt.blockNumber}`);
      setFormData({ holderDid: '', degreeName: '', graduationDate: '', cgpa: '' });
      setActiveTab('dashboard');
      fetchCredentials();
    } catch (e: any) {
      console.error(e);
      alert(e?.reason || e?.message || 'Issue failed');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRevoke = async (hash: string) => {
    const reason = prompt('Reason code (1=administrative):', '1');
    if (reason === null) return;
    const details = prompt('Details:', 'Demo revocation') || '';
    try {
      const res = await fetch(`${API_URL}/api/v1/credentials/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuer_did: issuerDid,
          credential_hash: hash,
          reason_code: parseInt(reason, 10),
          details,
        }),
      });
      if (res.ok) {
        alert('Credential revoked; Merkle root published to gateway.');
        fetchCredentials();
      } else {
        alert((await res.json()).detail || 'Revoke failed');
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="glass-panel p-12 rounded-3xl max-w-md w-full flex flex-col items-center gap-6">
          <FileBadge className="h-10 w-10 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">Issuer Portal</h1>
          <p className="text-gray-400 text-sm">Connect MetaMask to register and issue credentials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className="w-full md:w-64 flex flex-col gap-6">
          <div className="glass-panel p-2 rounded-2xl flex flex-col">
            {(['dashboard', 'register', 'issue'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-medium capitalize ${
                  activeTab === tab ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'issue' ? 'Issue Credential' : tab}
              </button>
            ))}
          </div>
          <div className="glass-panel p-5 rounded-2xl">
            <p className="text-xs text-gray-500 uppercase mb-2">Issuer DID</p>
            <p className="text-xs font-mono text-gray-300 break-all">{issuerDid}</p>
            {issuerProfile ? (
              <div className="flex items-center gap-2 mt-3 text-xs text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Registered: {issuerProfile.name}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-3 text-xs text-amber-400">
                <ShieldAlert className="h-3 w-3" /> Not registered — complete Register tab
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'register' && (
            <div className="glass-panel p-8 rounded-3xl flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white">Register as Issuer</h2>
              <p className="text-gray-400 text-sm">
                Calls IssuerRegistry.selfRegister from your wallet, then records the institution in the API.
              </p>
              <input
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white"
                placeholder="Institution name"
              />
              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 flex justify-center gap-2"
              >
                {isRegistering && <Loader2 className="h-5 w-5 animate-spin" />}
                Register on-chain
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white">Issued Credentials</h2>
              {credentials.map((cred) => (
                <div key={cred.hash} className="glass-panel p-4 rounded-xl flex justify-between items-center gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-mono truncate">{cred.hash}</p>
                    <p className="text-xs text-gray-400">Holder: {cred.holder_did}</p>
                    <p className="text-xs text-gray-500">Anchor: {cred.on_chain?.status || 'unknown'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${cred.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {cred.status}
                    </span>
                    {cred.status === 'Active' && (
                      <button onClick={() => handleRevoke(cred.hash)} className="text-xs text-red-400 hover:text-red-300">
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {credentials.length === 0 && <p className="text-gray-500">No credentials yet.</p>}
            </div>
          )}

          {activeTab === 'issue' && (
            <div className="glass-panel p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6">Issue &amp; Anchor Credential</h2>
              <form onSubmit={handleIssue} className="flex flex-col gap-4">
                <input required placeholder="Holder DID (did:ethr:0x...)" value={formData.holderDid} onChange={(e) => setFormData({ ...formData, holderDid: e.target.value })} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
                <input required placeholder="Degree name" value={formData.degreeName} onChange={(e) => setFormData({ ...formData, degreeName: e.target.value })} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
                <input required type="date" value={formData.graduationDate} onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
                <input required type="number" step="0.01" placeholder="CGPA" value={formData.cgpa} onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })} className="bg-black/50 border border-gray-800 rounded-xl px-4 py-3 text-white" />
                <button type="submit" disabled={isIssuing || !issuerProfile} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl disabled:opacity-50 flex justify-center gap-2">
                  {isIssuing && <Loader2 className="h-5 w-5 animate-spin" />}
                  Sign anchor in MetaMask
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
