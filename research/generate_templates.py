import os
from PIL import Image, ImageDraw, ImageFont

def generate_template(output_path, name, cgpa, date, degree="Bachelor of Science"):
    # Create a blank white image
    img = Image.new('RGB', (800, 600), color='white')
    d = ImageDraw.Draw(img)
    
    # Try to load a font, otherwise use default
    try:
        # Assuming Arial is available, otherwise this will fallback to default below
        font_large = ImageFont.truetype("arial.ttf", 48)
        font_med = ImageFont.truetype("arial.ttf", 32)
        font_small = ImageFont.truetype("arial.ttf", 24)
    except IOError:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw Header
    d.text((200, 50), "TrustVerse University", fill=(0,0,128), font=font_large)
    
    # Draw body
    d.text((100, 200), f"This certifies that", fill=(0,0,0), font=font_small)
    d.text((100, 250), name, fill=(0,0,0), font=font_med)
    d.text((100, 320), f"has completed the degree of", fill=(0,0,0), font=font_small)
    d.text((100, 370), degree, fill=(0,0,0), font=font_med)
    
    d.text((100, 450), f"CGPA: {cgpa}", fill=(0,0,0), font=font_small)
    d.text((500, 450), f"Date: {date}", fill=(0,0,0), font=font_small)
    
    # Draw a mock logo / seal
    d.ellipse((600, 150, 750, 300), outline=(128,0,0), width=10)
    d.text((640, 210), "SEAL", fill=(128,0,0), font=font_med)
    
    img.save(output_path)

if __name__ == "__main__":
    os.makedirs("research/data/templates", exist_ok=True)
    
    templates = [
        {"id": 1, "name": "Alice Smith", "cgpa": "3.9", "date": "2026-05-15"},
        {"id": 2, "name": "Bob Jones", "cgpa": "3.2", "date": "2026-05-15"},
        {"id": 3, "name": "Charlie Brown", "cgpa": "4.0", "date": "2026-05-15"},
        {"id": 4, "name": "Diana Prince", "cgpa": "3.8", "date": "2026-05-15"},
        {"id": 5, "name": "Evan Wright", "cgpa": "2.9", "date": "2026-05-15"}
    ]
    
    for t in templates:
        generate_template(f"research/data/templates/cert_{t['id']}.png", t['name'], t['cgpa'], t['date'])
        
    print(f"Generated {len(templates)} templates.")
