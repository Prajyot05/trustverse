"""
Train ForgeryDetectionCNN on ELA images of synthetic certificates.

DocTamper / CASIA v2 are large public sets that require a separate download
agreement; this script uses the committed TrustVerse synthetic certificate
generator (templates + distortion_simulator tampers) so the demo images are
in-distribution and the pipeline is fully reproducible without extra data.

Authentic class: original templates + benign distortions (jpeg, blur, rotate,
brightness, print-scan).
Forged class: name / CGPA tampers from apply_tampering.

Outputs:
  backend/models/forgery_cnn.pt
  eval/out/cnn_metrics.json
"""
import json
import os
import sys
import random
from io import BytesIO

import numpy as np
from PIL import Image
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))
sys.path.insert(0, os.path.join(ROOT, "research", "sdc-spike"))

from app.core.ai_forensics import ForgeryDetectionCNN, process_ela  # noqa: E402
from generate_templates import generate_template  # noqa: E402
from distortion_simulator import apply_distortions, apply_tampering  # noqa: E402

DATA_DIR = os.path.join(ROOT, "research", "sdc-spike", "data")
MODEL_OUT = os.path.join(ROOT, "backend", "models", "forgery_cnn.pt")
METRICS_OUT = os.path.join(ROOT, "eval", "out", "cnn_metrics.json")


def _ela_tensor(path: str, transform) -> torch.Tensor:
    with open(path, "rb") as f:
        ela = process_ela(f.read())
    return transform(ela)


class ElaDataset(Dataset):
    def __init__(self, items, transform):
        self.items = items
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        path, label = self.items[idx]
        return _ela_tensor(path, self.transform), torch.tensor([label], dtype=torch.float32)


def collect_paths():
    extra_dir = os.path.join(DATA_DIR, "extra_templates")
    os.makedirs(extra_dir, exist_ok=True)
    names = [
        "Alice Smith", "Bob Jones", "Charlie Brown", "Diana Prince", "Evan Wright",
        "Farah Khan", "Gita Patel", "Hiro Tanaka", "Ivy Chen", "Jamal Rahman",
        "Kiran Shah", "Lila Costa", "Marco Rossi", "Nina Volkov", "Omar Haddad",
        "Priya Nair", "Quinn Park", "Rosa Alvarez", "Samir Aziz", "Tina Berg",
    ]
    for i, name in enumerate(names, start=1):
        out = os.path.join(extra_dir, f"extra_{i}.png")
        if not os.path.exists(out):
            generate_template(out, name, f"{2.5 + (i % 15) * 0.1:.1f}", "2026-05-15")

    extra_dist = os.path.join(DATA_DIR, "extra_distortions")
    extra_tamp = os.path.join(DATA_DIR, "extra_tampered")
    if not os.path.isdir(extra_dist) or len(os.listdir(extra_dist)) < 10:
        for fname in os.listdir(extra_dir):
            if fname.endswith(".png"):
                apply_distortions(os.path.join(extra_dir, fname), extra_dist, fname.split(".")[0])
                apply_tampering(os.path.join(extra_dir, fname), extra_tamp, fname.split(".")[0])

    authentic, forged = [], []
    for folder, bucket in (
        (os.path.join(DATA_DIR, "templates"), authentic),
        (os.path.join(DATA_DIR, "distortions"), authentic),
        (extra_dir, authentic),
        (extra_dist, authentic),
        (os.path.join(DATA_DIR, "tampered"), forged),
        (extra_tamp, forged),
    ):
        if not os.path.isdir(folder):
            continue
        for fname in os.listdir(folder):
            if fname.lower().endswith((".png", ".jpg", ".jpeg")):
                bucket.append(os.path.join(folder, fname))
    return authentic, forged


def main():
    random.seed(42)
    torch.manual_seed(42)
    authentic, forged = collect_paths()
    items = [(p, 1.0) for p in authentic] + [(p, 0.0) for p in forged]
    random.shuffle(items)
    split = int(0.8 * len(items))
    train_items, test_items = items[:split], items[split:]

    transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])
    train_loader = DataLoader(ElaDataset(train_items, transform), batch_size=16, shuffle=True)
    test_loader = DataLoader(ElaDataset(test_items, transform), batch_size=16)

    device = torch.device("cpu")
    model = ForgeryDetectionCNN().to(device)
    opt = optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.BCELoss()

    epochs = int(os.getenv("CNN_EPOCHS", "8"))
    for epoch in range(epochs):
        model.train()
        running = 0.0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            pred = model(x)
            loss = loss_fn(pred, y)
            loss.backward()
            opt.step()
            running += loss.item()
        print(f"epoch {epoch+1}/{epochs} loss={running/max(len(train_loader),1):.4f}")

    model.eval()
    ys, ps = [], []
    with torch.no_grad():
        for x, y in test_loader:
            pred = model(x).cpu().numpy().reshape(-1)
            ys.extend(y.numpy().reshape(-1).tolist())
            ps.extend(pred.tolist())
    y_true = np.array(ys)
    y_prob = np.array(ps)
    y_hat = (y_prob > 0.6).astype(int)
    metrics = {
        "n_train": len(train_items),
        "n_test": len(test_items),
        "n_authentic": len(authentic),
        "n_forged": len(forged),
        "accuracy": float(accuracy_score(y_true, y_hat)),
        "precision": float(precision_score(y_true, y_hat, zero_division=0)),
        "recall": float(recall_score(y_true, y_hat, zero_division=0)),
        "f1": float(f1_score(y_true, y_hat, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)) if len(set(y_true)) > 1 else None,
        "threshold": 0.6,
        "dataset": "synthetic TrustVerse certificates (ELA); DocTamper/CASIA fallback not downloaded",
        "epochs": epochs,
    }
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    os.makedirs(os.path.dirname(METRICS_OUT), exist_ok=True)
    torch.save(model.state_dict(), MODEL_OUT)
    with open(METRICS_OUT, "w") as f:
        json.dump(metrics, f, indent=2)
    print("saved", MODEL_OUT)
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
