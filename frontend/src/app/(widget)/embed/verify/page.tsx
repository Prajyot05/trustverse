"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useServices } from "@/services";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function EmbedInner() {
  const { api, product } = useServices();
  const params = useSearchParams();
  const [hash, setHash] = useState(params.get("hash") ?? "");
  const [share, setShare] = useState(params.get("share") ?? "");
  const [result, setResult] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const run = async () => {
    if (share) {
      const rec = await product.getShare(share);
      setOk(rec.result !== "fail");
      setResult(rec.result === "fail" ? rec.fail_reason || "Failed" : "Verified — no attributes disclosed");
      return;
    }
    const r = await api.publicVerify(hash);
    setOk(r.is_valid);
    setResult(r.reason || "");
  };

  return (
    <div className="p-4">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">Verify with TrustVerse</p>
      <div className="mt-3 flex gap-2">
        <Input
          value={share || hash}
          onChange={(e) => {
            if (share) setShare(e.target.value);
            else setHash(e.target.value);
          }}
          placeholder="Credential hash or share token"
          className="font-mono text-xs"
        />
        <Button size="sm" onClick={() => void run()}>
          Verify
        </Button>
      </div>
      {result && (
        <Alert variant={ok ? "success" : "destructive"} className="mt-3">
          <AlertTitle>{ok ? "Verified" : "Not verified"}</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function EmbedVerifyPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading widget…</p>}>
      <EmbedInner />
    </Suspense>
  );
}
