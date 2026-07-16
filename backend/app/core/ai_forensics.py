import os
import cv2
import numpy as np
import imagehash
from PIL import Image, ImageChops, ImageEnhance
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as transforms
from io import BytesIO

# ==============================================================================
# 1. Error Level Analysis (ELA) Processing
# ==============================================================================
def process_ela(image_bytes: bytes, quality: int = 90) -> Image.Image:
    """
    Performs Error Level Analysis (ELA) on an image.
    Saves the image at a known quality and compares it with the original.
    """
    original = Image.open(BytesIO(image_bytes)).convert("RGB")
    
    # Save at lower quality in memory
    temp_io = BytesIO()
    original.save(temp_io, "JPEG", quality=quality)
    temp_io.seek(0)
    
    compressed = Image.open(temp_io)
    
    # Calculate difference
    ela_image = ImageChops.difference(original, compressed)
    
    # Enhance difference to make it visible
    extrema = ela_image.getextrema()
    max_diff = max([ex[1] for ex in extrema])
    if max_diff == 0:
        max_diff = 1
        
    scale = 255.0 / max_diff
    ela_image = ImageEnhance.Brightness(ela_image).enhance(scale)
    return ela_image

# ==============================================================================
# 2. PyTorch CNN Model for Forgery Detection
# ==============================================================================
class ForgeryDetectionCNN(nn.Module):
    """
    A lightweight CNN designed to detect structural anomalies from ELA images.
    Input: 128x128 RGB Image (ELA processed)
    Output: Probability of being authentic.
    """
    def __init__(self):
        super(ForgeryDetectionCNN, self).__init__()
        # Conv Block 1
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.pool1 = nn.MaxPool2d(2, 2)
        
        # Conv Block 2
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool2 = nn.MaxPool2d(2, 2)
        
        # Conv Block 3
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.pool3 = nn.MaxPool2d(2, 2)
        
        # Fully Connected
        self.fc1 = nn.Linear(128 * 16 * 16, 256)
        self.drop = nn.Dropout(0.5)
        self.fc2 = nn.Linear(256, 1)

    def forward(self, x):
        x = self.pool1(F.relu(self.bn1(self.conv1(x))))
        x = self.pool2(F.relu(self.bn2(self.conv2(x))))
        x = self.pool3(F.relu(self.bn3(self.conv3(x))))
        
        x = x.view(-1, 128 * 16 * 16) # Flatten
        x = F.relu(self.fc1(x))
        x = self.drop(x)
        x = torch.sigmoid(self.fc2(x)) # Probability output (0 to 1)
        return x

# Lazy initialization of the model
_model = None

def get_model() -> ForgeryDetectionCNN:
    global _model
    if _model is None:
        _model = ForgeryDetectionCNN()
        _model.eval()
        # In a real scenario, we would load weights here:
        # _model.load_state_dict(torch.load("weights/best_model.pth"))
    return _model

def analyze_image_authenticity(image_bytes: bytes) -> dict:
    """
    Runs the full ELA + CNN inference pipeline.
    """
    try:
        # 1. Generate ELA
        ela_img = process_ela(image_bytes)
        
        # 2. Transform for PyTorch
        transform = transforms.Compose([
            transforms.Resize((128, 128)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        ])
        
        input_tensor = transform(ela_img).unsqueeze(0) # Add batch dimension
        
        # 3. Inference
        model = get_model()
        with torch.no_grad():
            score = model(input_tensor).item()
            
        # Return results
        return {
            "authenticity_score": score,
            "is_authentic": score > 0.6,
            "confidence": abs(score - 0.5) * 2 # 0 to 1
        }
    except Exception as e:
        raise ValueError(f"Failed to analyze image: {str(e)}")

# ==============================================================================
# 3. Perceptual Hashing (pHash)
# ==============================================================================
def compute_phash(image_bytes: bytes) -> str:
    """
    Computes a Perceptual Hash (pHash) for image deduplication and tracking.
    Unlike cryptographic hashes, similar images will have similar pHashes.
    """
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    h = imagehash.phash(img)
    return str(h)
