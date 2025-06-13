const fs = require('fs');
const path = require('path');

// Script to generate PWA icons from the existing logo.png
// In a production environment, you should use an image processing library like sharp to resize properly

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const sourceIcon = path.join(__dirname, '../public/icons/logo.png');
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Check if source file exists
if (fs.existsSync(sourceIcon)) {
  console.log('Found logo.png, creating PWA icons...');
  
  sizes.forEach(size => {
    const targetFile = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    // Temporarily copy the original file, should be resized properly in production
    if (!fs.existsSync(targetFile)) {
      fs.copyFileSync(sourceIcon, targetFile);
      console.log(`Created ${size}x${size} icon`);
    } else {
      console.log(`${size}x${size} icon already exists`);
    }
  });
  
  console.log('PWA icons generated successfully!');
  console.log('Note: These are copies of the original logo.png');
  console.log('For production, you should resize them to the proper dimensions using an image editor.');
} else {
  console.error('logo.png not found in public/icons/');
} 