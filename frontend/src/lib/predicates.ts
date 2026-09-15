export interface PredicateParamDef {
  key: string;
  label: string;
  type: "number" | "string";
  default?: string | number;
}

export interface PredicateDef {
  id: string;
  label: string;
  description: string;
  circuit: string;
  discloses: string[];
  hides: string[];
  params: PredicateParamDef[];
}

export const PREDICATES: PredicateDef[] = [
  {
    id: "cgpa_gte",
    label: "CGPA at or above a threshold",
    description: "Prove CGPA ≥ a cutoff without revealing the exact score.",
    circuit: "ClaimProver",
    discloses: ["Whether CGPA meets the threshold", "That the credential is not revoked"],
    hides: ["Exact CGPA", "Degree title", "Graduation date"],
    params: [{ key: "threshold", label: "Minimum CGPA", type: "number", default: 7 }],
  },
  {
    id: "degree_eq",
    label: "Holds a specific degree",
    description: "Prove the committed degree title matches.",
    circuit: "commitment-bound",
    discloses: ["Whether the degree title matches", "That the credential is not revoked"],
    hides: ["CGPA", "Other degree details"],
    params: [
      {
        key: "degree",
        label: "Degree title",
        type: "string",
        default: "Bachelor of Computer Engineering",
      },
    ],
  },
  {
    id: "year_range",
    label: "Graduated in a year range",
    description: "Prove issue year falls within a range.",
    circuit: "commitment-bound",
    discloses: ["Whether graduation year is in range", "That the credential is not revoked"],
    hides: ["Exact date", "CGPA"],
    params: [
      { key: "from_year", label: "From year", type: "number", default: 2020 },
      { key: "to_year", label: "To year", type: "number", default: 2026 },
    ],
  },
  {
    id: "graduated",
    label: "Has graduated",
    description: "Boolean: an active, anchored credential exists.",
    circuit: "NonRevocation",
    discloses: ["That a valid degree credential exists and is not revoked"],
    hides: ["CGPA", "Degree title", "Graduation date"],
    params: [],
  },
  {
    id: "issuer_set",
    label: "Issued by an approved university",
    description: "Prove the issuer DID is in a requested allow-list.",
    circuit: "IssuerMembership",
    discloses: ["That the issuer is in the verifier's allow-list"],
    hides: ["All academic attributes"],
    params: [
      {
        key: "issuer_dids",
        label: "Allowed issuer DIDs (comma-separated)",
        type: "string",
      },
    ],
  },
];

export function getPredicate(id?: string | null): PredicateDef {
  return PREDICATES.find((p) => p.id === id) ?? PREDICATES[0];
}

export function evaluateLocalPredicate(
  predicate: string,
  params: Record<string, unknown> | undefined,
  subject: { degree?: string; cgpa?: number | string; date?: string } | undefined,
  issuerDid: string | undefined,
  status: string
): { pass: boolean; reason: string } {
  const p = params ?? {};
  if (status && status.toLowerCase() !== "active") {
    return { pass: false, reason: "revoked" };
  }
  if (predicate === "cgpa_gte") {
    const threshold = Number(p.threshold ?? 0);
    const cgpa = Number(subject?.cgpa ?? 0);
    return cgpa >= threshold
      ? { pass: true, reason: "pass" }
      : { pass: false, reason: "threshold_miss" };
  }
  if (predicate === "degree_eq") {
    const wanted = String(p.degree ?? "").trim().toLowerCase();
    const got = String(subject?.degree ?? "").trim().toLowerCase();
    return wanted && got === wanted
      ? { pass: true, reason: "pass" }
      : { pass: false, reason: "degree_mismatch" };
  }
  if (predicate === "year_range") {
    const from = Number(p.from_year ?? 0);
    const to = Number(p.to_year ?? 9999);
    const year = Number(String(subject?.date ?? "").slice(0, 4));
    return year >= from && year <= to
      ? { pass: true, reason: "pass" }
      : { pass: false, reason: "year_out_of_range" };
  }
  if (predicate === "issuer_set") {
    const allowed = String(p.issuer_dids ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.length) return { pass: true, reason: "pass" };
    return allowed.includes((issuerDid ?? "").toLowerCase())
      ? { pass: true, reason: "pass" }
      : { pass: false, reason: "issuer_not_in_set" };
  }
  return { pass: true, reason: "pass" };
}

export function failReasonLabel(reason?: string | null): string {
  switch (reason) {
    case "threshold_miss":
      return "The CGPA threshold was not met";
    case "revoked":
      return "This credential has been revoked";
    case "degree_mismatch":
      return "The degree title does not match";
    case "year_out_of_range":
      return "Graduation year is outside the requested range";
    case "issuer_not_in_set":
      return "The issuer is not on the approved list";
    case "expired":
      return "This request has expired";
    default:
      return reason ? reason.replace(/_/g, " ") : "The proof did not pass";
  }
}
