"""
Rough end-to-end latency breakdown for the demo happy path (localhost).
Requires backend on :8000 and Hardhat on :8545 with deployed contracts + demo seed.
"""
import json
import os
import time
import urllib.parse
import urllib.request

API = os.getenv("TRUSTVERSE_API", "http://127.0.0.1:8000")
OUT = os.path.join(os.path.dirname(__file__), "out", "latency_happy_path.json")


def get(path: str):
    with urllib.request.urlopen(f"{API}{path}", timeout=30) as r:
        return json.loads(r.read().decode())


def post(path: str, body: dict):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f"{API}{path}", data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


def main():
    stages = {}
    t0 = time.perf_counter()
    try:
        post("/api/v1/demo/seed", {})
        stages["demo_seed_ms"] = (time.perf_counter() - t0) * 1000

        t1 = time.perf_counter()
        root = get("/api/v1/credentials/revocation/root")
        stages["revocation_root_ms"] = (time.perf_counter() - t1) * 1000

        t2 = time.perf_counter()
        holder = "did:ethr:0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        reqs = get(f"/api/v1/verify/requests?holder_did={urllib.parse.quote(holder)}")
        stages["list_requests_ms"] = (time.perf_counter() - t2) * 1000

        t3 = time.perf_counter()
        get("/api/v1/verify/0x0000000000000000000000000000000000000000000000000000000000000000")
        stages["public_verify_ms"] = (time.perf_counter() - t3) * 1000

        stages["total_ms"] = (time.perf_counter() - t0) * 1000
        stages["note"] = "Proof generation in browser not measured here; see proof_times.json"
        stages["revocation_root"] = root
        stages["pending_requests"] = len(reqs) if isinstance(reqs, list) else reqs
    except Exception as exc:
        stages["error"] = str(exc)
        stages["hint"] = "Start ./scripts/dev.sh then re-run eval/latency_happy_path.py"

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(stages, f, indent=2)
    print(json.dumps(stages, indent=2))


if __name__ == "__main__":
    main()
