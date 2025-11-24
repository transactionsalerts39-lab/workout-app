const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  inputFile: path.join(__dirname, '../Research/raw_html/truecoach_features_20251016_201212.html'),
  outputFile: path.join(__dirname, '../Research/processed/yourbrand_features.html'),
  oldBrand: 'TrueCoach',
  newBrand: 'YourBrandName', // Replace with your actual brand name
  oldDomain: 'truecoach.co',
  newDomain: 'yourbrand.com' // Replace with your domain
};

// Create output directory if it doesn't exist
const outputDir = path.dirname(config.outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read the input file
let html = fs.readFileSync(config.inputFile, 'utf8');

// Perform replacements
html = html
  .replace(new RegExp(config.oldBrand, 'g'), config.newBrand)
  .replace(new RegExp(config.oldDomain, 'g'), config.newDomain)
  .replace(/truecoachco/g, config.newBrand.toLowerCase())
  .replace(/truecoachapp/g, config.newBrand.toLowerCase() + 'app');

// Write the output file
fs.writeFileSync(config.outputFile, html);

console.log(`Brand replacement completed!`);
console.log(`Input: ${config.inputFile}`);
console.log(`Output: ${config.outputFile}`);
console.log(`Replaced "${config.oldBrand}" with "${config.newBrand}"`);
