import { API_URL } from "@/lib/contracts";
import type { ProductServices, TxReceipt } from "./types";

async function parseError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (typeof body.detail === "string") return body.detail;
  return res.statusText || "Request failed";
}

export function createLiveProduct(): ProductServices {
  const base = `${API_URL}/api/v1/product`;
  return {
    async listNotifications(did) {
      const res = await fetch(`${base}/notifications?did=${encodeURIComponent(did)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async markNotificationRead(id) {
      await fetch(`${base}/notifications/${id}/read`, { method: "POST" });
    },
    async listEvents(did) {
      const res = await fetch(`${base}/events?actor_did=${encodeURIComponent(did)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async createShare(params) {
      const res = await fetch(`${base}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async listShares(holderDid) {
      const res = await fetch(`${base}/shares?holder_did=${encodeURIComponent(holderDid)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async getShare(token) {
      const res = await fetch(`${base}/shares/${token}`);
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async revokeShare(token) {
      const res = await fetch(`${base}/shares/${token}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error(await parseError(res));
    },
    async listTemplates(issuerDid) {
      const res = await fetch(`${base}/templates?issuer_did=${encodeURIComponent(issuerDid)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async saveTemplate(t) {
      const res = await fetch(`${base}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async listDirectory() {
      const res = await fetch(`${base}/directory`);
      if (!res.ok) return [];
      return res.json();
    },
    async verifyIssuerDomain(did, domain, accreditation) {
      const res = await fetch(`${base}/directory/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ did, domain, accreditation }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async createPresentation(params) {
      const res = await fetch(`${base}/presentations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async getPresentation(id) {
      const res = await fetch(`${base}/presentations/${id}`);
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async getAnalytics(did, role) {
      const res = await fetch(
        `${base}/analytics?did=${encodeURIComponent(did)}&role=${encodeURIComponent(role)}`
      );
      if (!res.ok) return {};
      return res.json();
    },
    async listStaff(issuerDid) {
      const res = await fetch(`${base}/staff?issuer_did=${encodeURIComponent(issuerDid)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async addStaff(params) {
      const res = await fetch(`${base}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async listWebhooks(did) {
      const res = await fetch(`${base}/webhooks?owner_did=${encodeURIComponent(did)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async createWebhook(params) {
      const res = await fetch(`${base}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async listApiKeys(did) {
      const res = await fetch(`${base}/keys?owner_did=${encodeURIComponent(did)}`);
      if (!res.ok) return [];
      return res.json();
    },
    async createApiKey(did, name) {
      const res = await fetch(`${base}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_did: did, name }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async batchIssue(params) {
      const res = await fetch(`${base}/credentials/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      return res.json();
    },
    async relayAnchor(params) {
      const res = await fetch(`${base}/relay/anchor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const data = await res.json();
      return { hash: data.hash, blockNumber: data.blockNumber } as TxReceipt;
    },
    async listPredicates() {
      const res = await fetch(`${base}/predicates`);
      if (!res.ok) return [];
      return res.json();
    },
  };
}
