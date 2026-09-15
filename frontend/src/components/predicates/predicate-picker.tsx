"use client";

import { PREDICATES, getPredicate, type PredicateDef } from "@/lib/predicates";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PredicatePickerProps {
  value: string;
  params: Record<string, string>;
  onChange: (id: string, params: Record<string, string>) => void;
}

export function PredicatePicker({ value, params, onChange }: PredicatePickerProps) {
  const current = getPredicate(value);

  const setId = (id: string) => {
    const def = getPredicate(id);
    const next: Record<string, string> = {};
    for (const p of def.params) {
      next[p.key] = params[p.key] ?? String(p.default ?? "");
    }
    onChange(id, next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="predicate">What should they prove?</Label>
        <select
          id="predicate"
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
          value={value}
          onChange={(e) => setId(e.target.value)}
        >
          {PREDICATES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{current.description}</p>
      </div>
      {current.params.map((p) => (
        <div key={p.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`pred-${p.key}`}>{p.label}</Label>
          <Input
            id={`pred-${p.key}`}
            type={p.type === "number" ? "number" : "text"}
            value={params[p.key] ?? String(p.default ?? "")}
            onChange={(e) => onChange(value, { ...params, [p.key]: e.target.value })}
          />
        </div>
      ))}
      <PredicateExplain def={current} />
    </div>
  );
}

export function PredicateExplain({ def }: { def: PredicateDef }) {
  return (
    <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
      <div className="rounded-lg border border-success/30 bg-success/5 p-3">
        <p className="font-medium text-success">They will learn</p>
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          {def.discloses.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="font-medium text-foreground">They will not see</p>
        <ul className="mt-1 list-disc pl-4 text-muted-foreground">
          {def.hides.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
