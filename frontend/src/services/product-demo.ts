import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProductServices, ShareRecord, InboxItem, CredentialTemplate } from "./types";
import { UNIVERSITY_DID } from "./demo/personas";

interface ProductDemoState {
  notifications: InboxItem[];
  shares: ShareRecord[];
  templates: CredentialTemplate[];
  events: Array<{
    id: number;
    event_type: string;
    timestamp?: string;
    actor_did?: string;
    target_did?: string;
    payload?: Record<string, unknown>;
  }>;
  staff: Array<{ id: number; member_did: string; role: string; email?: string; issuer_did: string }>;
  webhooks: Array<{ id: number; url: string; owner_did: string; events?: string[] }>;
  keys: Array<{ id: number; name: string; prefix: string; owner_did: string }>;
  nextId: number;
  pushNotification: (n: Omit<InboxItem, "id">) => void;
}

export const useProductDemoStore = create<ProductDemoState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: 1,
          title: "Acme asked you to prove CGPA ≥ 8.0",
          body: "Open your wallet to review what they will and will not see.",
          kind: "proof_requested",
          href: "/demo/wallet?request=1",
          read: false,
          created_at: new Date().toISOString(),
        },
      ],
      shares: [],
      templates: [
        {
          id: "degree-v1",
          issuer_did: UNIVERSITY_DID,
          name: "Academic degree",
          schema_id: "degree-v1",
          fields: ["degree", "date", "cgpa"],
        },
      ],
      events: [],
      staff: [],
      webhooks: [],
      keys: [],
      nextId: 10,
      pushNotification: (n) =>
        set((s) => ({
          notifications: [{ ...n, id: s.nextId }, ...s.notifications],
          nextId: s.nextId + 1,
        })),
    }),
    { name: "trustverse-product-demo-v1" }
  )
);

function nid() {
  const s = useProductDemoStore.getState();
  const id = s.nextId;
  useProductDemoStore.setState({ nextId: id + 1 });
  return id;
}

export function createDemoProduct(): ProductServices {
  return {
    async listNotifications(did) {
      void did;
      return useProductDemoStore.getState().notifications;
    },
    async markNotificationRead(id) {
      useProductDemoStore.setState((s) => ({
        notifications: s.notifications.map((n) =>
          String(n.id) === String(id) ? { ...n, read: true } : n
        ),
      }));
    },
    async listEvents() {
      return useProductDemoStore.getState().events;
    },
    async createShare(params) {
      const token = `demo-${nid()}`;
      const rec: ShareRecord = {
        token,
        holder_did: params.holder_did,
        credential_hash: params.credential_hash,
        predicate: params.predicate,
        expires_at: new Date(Date.now() + (params.expires_in_hours ?? 168) * 3600_000).toISOString(),
        revoked: false,
        label: params.label,
        url: `/demo/verify?share=${token}`,
      };
      useProductDemoStore.setState((s) => ({ shares: [rec, ...s.shares] }));
      return rec;
    },
    async listShares(holderDid) {
      return useProductDemoStore
        .getState()
        .shares.filter((s) => s.holder_did === holderDid);
    },
    async getShare(token) {
      const rec = useProductDemoStore.getState().shares.find((s) => s.token === token);
      if (!rec) throw new Error("Share not found");
      return { ...rec, result: rec.revoked ? "fail" : "pass", issuer_name: "TrustVerse University", issuer_verified: true };
    },
    async revokeShare(token) {
      useProductDemoStore.setState((s) => ({
        shares: s.shares.map((sh) => (sh.token === token ? { ...sh, revoked: true } : sh)),
      }));
    },
    async listTemplates(issuerDid) {
      const rows = useProductDemoStore.getState().templates.filter((t) => t.issuer_did === issuerDid);
      return rows.length ? rows : useProductDemoStore.getState().templates;
    },
    async saveTemplate(t) {
      const rec: CredentialTemplate = {
        id: crypto.randomUUID(),
        issuer_did: t.issuer_did,
        name: t.name,
        schema_id: t.schema_id ?? "degree-v1",
        fields: t.fields ?? ["degree", "date", "cgpa"],
      };
      useProductDemoStore.setState((s) => ({ templates: [...s.templates, rec] }));
      return rec;
    },
    async listDirectory() {
      return [
        {
          did: UNIVERSITY_DID,
          name: "TrustVerse University",
          domain: "trustverse.university",
          verified: true,
          accreditation: "NAAC A++",
          issued: 2,
        },
      ];
    },
    async verifyIssuerDomain(did, domain, accreditation) {
      return { did, name: "Verified issuer", domain, verified: true, accreditation };
    },
    async createPresentation(params) {
      return {
        id: `vp-${nid()}`,
        holder_did: params.holder_did,
        payload: { type: ["VerifiablePresentation"], holder: params.holder_did },
        oid4vp: { format: "ldp_vp" },
      };
    },
    async getPresentation(id) {
      return { id, holder_did: "", payload: {} };
    },
    async getAnalytics() {
      return { issued: 2, revoked: 1, claimed: 2, claim_rate: 1, verifications: 1, fulfilled: 0, pending: 1, failed: 0, total: 1 };
    },
    async listStaff() {
      return useProductDemoStore.getState().staff;
    },
    async addStaff(params) {
      const rec = { id: nid(), ...params };
      useProductDemoStore.setState((s) => ({ staff: [...s.staff, rec] }));
      return rec;
    },
    async listWebhooks(did) {
      return useProductDemoStore.getState().webhooks.filter((w) => w.owner_did === did);
    },
    async createWebhook(params) {
      const rec = { id: nid(), ...params, events: ["VerificationCompleted"] };
      useProductDemoStore.setState((s) => ({ webhooks: [...s.webhooks, rec] }));
      return rec;
    },
    async listApiKeys(did) {
      return useProductDemoStore.getState().keys.filter((k) => k.owner_did === did);
    },
    async createApiKey(did, name) {
      const rec = { id: nid(), name, prefix: "tv_demo", owner_did: did, key: "tv_demo_" + nid() };
      useProductDemoStore.setState((s) => ({ keys: [...s.keys, rec] }));
      return rec;
    },
    async batchIssue(params) {
      void params;
      return { count: 0, credentials: [] };
    },
    async relayAnchor() {
      return { hash: "0xdemo", blockNumber: 1 };
    },
    async listPredicates() {
      return [
        { id: "cgpa_gte", label: "CGPA at or above a threshold" },
        { id: "degree_eq", label: "Holds a specific degree" },
        { id: "year_range", label: "Graduated in a year range" },
        { id: "graduated", label: "Has graduated" },
        { id: "issuer_set", label: "Issued by an approved university" },
      ];
    },
  };
}
