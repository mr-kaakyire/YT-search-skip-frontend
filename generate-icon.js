const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a 16x16 canvas
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Draw red background
ctx.fillStyle = '#FF0000';
ctx.fillRect(0, 0, 16, 16);

// Draw white hamburger lines
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(3, 4, 10, 2);  // Top line
ctx.fillRect(3, 7, 10, 2);  // Middle line
ctx.fillRect(3, 10, 10, 2); // Bottom line

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'public', 'icon16.png'), buffer); 