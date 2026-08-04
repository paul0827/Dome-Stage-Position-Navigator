const fs = require('fs');
const path = require('path');

// Read and parse the txt file
const txtPath = path.join('C:\\Users\\70340\\Downloads\\新增資料夾', 'fiveContinents.txt');
const txtContent = fs.readFileSync(txtPath, 'utf8');
const txtLines = txtContent.trim().split('\n');

const fiveContinentsData = {};
for (let i = 1; i < txtLines.length; i++) {
  const parts = txtLines[i].split('\t');
  const id = parts[0].trim();
  const val1 = parts[1] ? parts[1].trim() : '';
  const val2 = parts[2] ? parts[2].trim() : '';
  
  // Use first occurrence (which has both values)
  if (!fiveContinentsData[id]) {
    fiveContinentsData[id] = { fiveContinents1: val1, fiveContinents2: val2 };
  }
}

console.log(`Parsed ${Object.keys(fiveContinentsData).length} unique IDs from txt`);

// Read data.js
const dataPath = path.join(__dirname, 'data.js');
let dataContent = fs.readFileSync(dataPath, 'utf8');

// Build regex to match id field and fiveContinents fields
const idPattern = /id:\s*"([^"]+)"/;
const fiveCont1Pattern = /fiveContinents1:\s*"([^"]*)"/;
const fiveCont2Pattern = /fiveContinents2:\s*"([^"]*)"/;

const lines = dataContent.split('\n');
let updatedCount = 0;
let notFoundCount = 0;
const notFoundIds = [];

for (let i = 0; i < lines.length; i++) {
  const idMatch = lines[i].match(idPattern);
  if (!idMatch) continue;
  
  const id = idMatch[1];
  if (fiveContinentsData[id]) {
    const { fiveContinents1, fiveContinents2 } = fiveContinentsData[id];
    
    // Replace fiveContinents1
    lines[i] = lines[i].replace(fiveCont1Pattern, `fiveContinents1: "${fiveContinents1}"`);
    // Replace fiveContinents2
    lines[i] = lines[i].replace(fiveCont2Pattern, `fiveContinents2: "${fiveContinents2}"`);
    updatedCount++;
  } else {
    notFoundCount++;
    if (notFoundIds.length < 10) notFoundIds.push(id);
  }
}

console.log(`Updated ${updatedCount} entries in data.js`);
console.log(`IDs in data.js not found in txt: ${notFoundCount}`);
if (notFoundIds.length > 0) {
  console.log('Examples:', notFoundIds.join(', '));
}

// Write back
fs.writeFileSync(dataPath, lines.join('\n'), 'utf8');
console.log('Done!');
