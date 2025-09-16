const fs = require('fs');
const path = require('path');

// Create a simple 180x180 PNG with n0de brand colors
const { createCanvas } = require('canvas');

// If canvas is not installed, create a simple placeholder
try {
  const canvas = createCanvas(180, 180);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background (n0de colors)
  const gradient = ctx.createLinearGradient(0, 0, 180, 180);
  gradient.addColorStop(0, '#00D4FF'); // n0de cyan
  gradient.addColorStop(1, '#0096FF'); // n0de blue
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 180, 180);
  
  // Add "n" letter in the center
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 100px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('n', 90, 90);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/home/sol/n0de-deploy/frontend/public/apple-touch-icon.png', buffer);
  console.log('Apple touch icon created successfully!');
} catch (error) {
  // If canvas module is not available, create using ImageMagick
  console.log('Canvas not available, trying ImageMagick...');
  const { exec } = require('child_process');
  
  const command = `convert -size 180x180 \
    -define gradient:angle=135 \
    gradient:'#00D4FF-#0096FF' \
    -gravity center \
    -font DejaVu-Sans-Bold \
    -pointsize 100 \
    -fill black \
    -annotate +0+0 'n' \
    /home/sol/n0de-deploy/frontend/public/apple-touch-icon.png`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('Creating simple placeholder instead...');
      // Create a simple placeholder using bash
      exec(`convert -size 180x180 xc:'#00D4FF' -gravity center -font DejaVu-Sans-Bold -pointsize 100 -fill black -annotate +0+0 'n' /home/sol/n0de-deploy/frontend/public/apple-touch-icon.png`, (err) => {
        if (err) {
          console.error('Failed to create icon:', err);
        } else {
          console.log('Placeholder icon created!');
        }
      });
    } else {
      console.log('Apple touch icon created with ImageMagick!');
    }
  });
}