#!/usr/bin/env python3

from PIL import Image, ImageDraw, ImageFont
import os

# Create a 180x180 image
img = Image.new('RGB', (180, 180), '#00D4FF')
draw = ImageDraw.Draw(img)

# Try to add text (letter 'n')
try:
    # Try to use a system font
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
except:
    # Use default font if truetype not available
    font = ImageFont.load_default()

# Draw the letter 'n' in the center
text = 'n'
# Get text bounding box
bbox = draw.textbbox((0, 0), text, font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
position = ((180 - text_width) // 2, (180 - text_height) // 2)

draw.text(position, text, fill='black', font=font)

# Save the image
output_path = '/home/sol/n0de-deploy/frontend/public/apple-touch-icon.png'
img.save(output_path)
print(f"Apple touch icon created at {output_path}")