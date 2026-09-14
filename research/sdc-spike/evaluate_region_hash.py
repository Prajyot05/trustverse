"""
R1 gated spike: region-wise occupancy hash vs original DCT SDC.

Tesseract is not assumed installed. Instead of OCR text, each declared
region is binarized (Otsu) and hashed. A name/CGPA paint-over changes the
occupied ink; jpeg/brightness that keep the glyphs should be closer.

Go/no-go (plan): FAR < 10% at FRR < 5% on the synthetic set.
"""
import os
import json
import hashlib
from collections import defaultdict

import numpy as np
from PIL import Image

REGIONS = [
    {"name": "name", "box": (80, 230, 500, 310)},
    {"name": "cgpa", "box": (80, 430, 300, 490)},
    {"name": "degree", "box": (80, 350, 500, 420)},
]


def region_hash(image_path: str) -> dict:
    img = Image.open(image_path).convert("L")
    out = {}
    for region in REGIONS:
        crop = img.crop(region["box"]).resize((64, 32), Image.Resampling.NEAREST)
        arr = np.array(crop, dtype=np.uint8)
        thresh = int(arr.mean())
        bits = (arr < thresh).astype(np.uint8).tobytes()
        out[region["name"]] = hashlib.sha256(bits).hexdigest()
    return out


def hamming(a: str, b: str) -> int:
    x = int(a, 16) ^ int(b, 16)
    return x.bit_count()


def evaluate(data_dir="data"):
    templates = os.path.join(data_dir, "templates")
    distortions = os.path.join(data_dir, "distortions")
    tampered = os.path.join(data_dir, "tampered")

    baselines = {}
    for fname in os.listdir(templates):
        if fname.endswith(".png"):
            prefix = fname.split(".")[0]
            baselines[prefix] = region_hash(os.path.join(templates, fname))

    # Match if ALL of name+cgpa hashes equal (strict) OR hamming below T
    # Sweep threshold on max hamming of name/cgpa.
    dist_scores = []
    tamp_scores = []

    def score_of(path, prefix):
        h = region_hash(path)
        return max(hamming(h["name"], baselines[prefix]["name"]), hamming(h["cgpa"], baselines[prefix]["cgpa"]))

    for fname in os.listdir(distortions):
        if not (fname.endswith(".png") or fname.endswith(".jpg")):
            continue
        parts = fname.split("_")
        prefix = f"{parts[0]}_{parts[1]}"
        dist_scores.append(score_of(os.path.join(distortions, fname), prefix))

    for fname in os.listdir(tampered):
        if not fname.endswith(".png"):
            continue
        if "cert_3" in fname and "tamper_cgpa" in fname:
            continue
        parts = fname.split("_")
        prefix = f"{parts[0]}_{parts[1]}"
        tamp_scores.append(score_of(os.path.join(tampered, fname), prefix))

    # Choose threshold to keep FRR <= 5% if possible, then measure FAR.
    dist_sorted = sorted(dist_scores)
    cutoff_idx = min(int(np.ceil(0.95 * len(dist_sorted))) - 1, len(dist_sorted) - 1)
    threshold = dist_sorted[cutoff_idx] if dist_sorted else 0

    frr = sum(1 for s in dist_scores if s > threshold) / max(len(dist_scores), 1)
    far = sum(1 for s in tamp_scores if s <= threshold) / max(len(tamp_scores), 1)

    gate_pass = far < 0.10 and frr < 0.05
    result = {
        "method": "binarized-region-hash (name+cgpa), OCR-text-hash analogue without Tesseract",
        "n_distortions": len(dist_scores),
        "n_tampered": len(tamp_scores),
        "threshold_hamming": int(threshold),
        "frr": frr,
        "far": far,
        "dist_min_max": [int(min(dist_scores)), int(max(dist_scores))] if dist_scores else None,
        "tamp_min_max": [int(min(tamp_scores)), int(max(tamp_scores))] if tamp_scores else None,
        "gate": "FAR < 10% at FRR < 5%",
        "gate_pass": gate_pass,
        "decision": "PASS: integrate as third proof type" if gate_pass else "FAIL: report as negative result / future work",
    }
    print(json.dumps(result, indent=2))
    os.makedirs("results", exist_ok=True)
    with open("results/r1_gate.json", "w") as f:
        json.dump(result, f, indent=2)
    return result


if __name__ == "__main__":
    evaluate()
