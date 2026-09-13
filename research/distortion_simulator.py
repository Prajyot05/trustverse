import os
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

def apply_distortions(image_path, output_dir, file_prefix):
    img = Image.open(image_path).convert('RGB')
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. JPEG Compression
    img.save(os.path.join(output_dir, f"{file_prefix}_jpeg_low.jpg"), "JPEG", quality=50)
    img.save(os.path.join(output_dir, f"{file_prefix}_jpeg_high.jpg"), "JPEG", quality=90)
    
    # 2. Gaussian Blur
    img.filter(ImageFilter.GaussianBlur(1.0)).save(os.path.join(output_dir, f"{file_prefix}_blur_1.png"))
    img.filter(ImageFilter.GaussianBlur(2.0)).save(os.path.join(output_dir, f"{file_prefix}_blur_2.png"))
    
    # 3. Rotation (slight)
    img.rotate(1, expand=False, fillcolor='white').save(os.path.join(output_dir, f"{file_prefix}_rot_1.png"))
    img.rotate(-2, expand=False, fillcolor='white').save(os.path.join(output_dir, f"{file_prefix}_rot_m2.png"))
    
    # 4. Brightness
    ImageEnhance.Brightness(img).enhance(0.8).save(os.path.join(output_dir, f"{file_prefix}_bright_low.png"))
    ImageEnhance.Brightness(img).enhance(1.2).save(os.path.join(output_dir, f"{file_prefix}_bright_high.png"))
    
    # 5. Print-scan simulation (blur + noise + slight color shift)
    ps_img = img.filter(ImageFilter.GaussianBlur(0.5))
    noise = np.random.normal(0, 10, (ps_img.height, ps_img.width, 3))
    ps_arr = np.array(ps_img) + noise
    ps_arr = np.clip(ps_arr, 0, 255).astype(np.uint8)
    Image.fromarray(ps_arr).save(os.path.join(output_dir, f"{file_prefix}_print_scan.png"))

def apply_tampering(image_path, output_dir, file_prefix):
    img = Image.open(image_path).convert('RGB')
    os.makedirs(output_dir, exist_ok=True)
    from PIL import ImageDraw, ImageFont
    
    d = ImageDraw.Draw(img)
    try:
        font_small = ImageFont.truetype("arial.ttf", 24)
        font_med = ImageFont.truetype("arial.ttf", 32)
    except IOError:
        font_small = ImageFont.load_default()
        font_med = ImageFont.load_default()
        
    # Tamper CGPA
    img_cgpa = img.copy()
    d_cgpa = ImageDraw.Draw(img_cgpa)
    d_cgpa.rectangle([100, 450, 300, 480], fill='white')
    d_cgpa.text((100, 450), "CGPA: 4.0", fill=(0,0,0), font=font_small)
    img_cgpa.save(os.path.join(output_dir, f"{file_prefix}_tamper_cgpa.png"))
    
    # Tamper Name
    img_name = img.copy()
    d_name = ImageDraw.Draw(img_name)
    d_name.rectangle([100, 250, 400, 300], fill='white')
    d_name.text((100, 250), "Eve Malicious", fill=(0,0,0), font=font_med)
    img_name.save(os.path.join(output_dir, f"{file_prefix}_tamper_name.png"))

if __name__ == "__main__":
    templates_dir = "research/data/templates"
    distortions_dir = "research/data/distortions"
    tampered_dir = "research/data/tampered"
    
    if not os.path.exists(templates_dir):
        print("Templates not found. Run generate_templates.py first.")
        exit(1)
        
    for file in os.listdir(templates_dir):
        if file.endswith(".png"):
            path = os.path.join(templates_dir, file)
            prefix = file.split('.')[0]
            apply_distortions(path, distortions_dir, prefix)
            apply_tampering(path, tampered_dir, prefix)
            
    print("Generated distortions and tampered images.")
