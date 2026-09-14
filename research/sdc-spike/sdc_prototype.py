import numpy as np
from PIL import Image
import hashlib

def dummy_poseidon(inputs):
    # Dummy placeholder for Poseidon hash, using SHA256 just for uniqueness in prototype
    # Real poseidon operates on field elements.
    # Convert inputs to bytes and hash
    data = b"".join([int(x).to_bytes(32, 'big', signed=True) for x in inputs])
    h = hashlib.sha256(data).digest()
    return int.from_bytes(h, 'big')

class SDCPrototype:
    def __init__(self, regions, region_size=(16, 16), quantization_bits=4):
        self.regions = regions  # list of dicts: {'name': 'header', 'box': (x1, y1, x2, y2)}
        self.region_size = region_size
        self.quantization_bits = quantization_bits
        self.levels = 2 ** quantization_bits

    def extract_sdc(self, image_path):
        """Extracts SDC hash and region feature vectors from an image using DCT."""
        from scipy.fft import dctn
        try:
            img = Image.open(image_path).convert('L') # Convert to grayscale
        except Exception as e:
            print(f"Error loading image {image_path}: {e}")
            return None, {}

        region_features = {}
        for region in self.regions:
            box = region['box']
            # Crop region
            cropped = img.crop(box)
            # Resize to a fixed grid (16x16)
            resized = cropped.resize((16, 16), Image.Resampling.BILINEAR)
            
            # Convert to float array
            pixels = np.array(resized, dtype=np.float32)
            
            # Compute 2D DCT
            dct_coeffs = dctn(pixels, type=2, norm='ortho')
            
            # Extract top-left 4x4 low-frequency components (excluding the DC component [0,0] if we want to ignore brightness shifts, but let's keep it for now)
            # Actually, ignoring DC component [0,0] makes it robust to brightness changes!
            low_freq = dct_coeffs[0:4, 0:4].flatten()
            low_freq[0] = 0 # Zero out DC component for brightness invariance
            
            # Normalize and round
            feature_vector = np.round(low_freq).astype(np.int64).tolist()
            
            region_features[region['name']] = feature_vector

        # Final SDC hash
        sorted_keys = sorted(region_features.keys())
        final_inputs = []
        for k in sorted_keys:
            final_inputs.extend(region_features[k])
            
        sdc_hash = dummy_poseidon(final_inputs)
        
        return sdc_hash, region_features
