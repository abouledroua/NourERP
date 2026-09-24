const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (filePath.endsWith('.jsx')) {
      results.push(filePath);
    }
  });
  return results;
};

const files = walk('frontend/src');
const keys = new Set();
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(/t\(['"]([^'"]+)['"]/g);
  for (const match of matches) {
    keys.add(match[1]);
  }
});

const checkMissing = (langPath) => {
  const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  const missing = [];
  for (const key of keys) {
    const parts = key.split('.');
    let current = langData;
    let found = true;
    for (const part of parts) {
      if (current && current[part] !== undefined) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (!found) missing.push(key);
  }
  return missing;
};

const missingEn = checkMissing('frontend/src/i18n/en.json');
const missingFr = checkMissing('frontend/src/i18n/fr.json');
const missingAr = checkMissing('frontend/src/i18n/ar.json');

console.log('Missing EN:', missingEn.length);
if (missingEn.length > 0) console.log(missingEn.slice(0, 10));

console.log('Missing FR:', missingFr.length);
if (missingFr.length > 0) console.log(missingFr.slice(0, 10));

console.log('Missing AR:', missingAr.length);
if (missingAr.length > 0) console.log(missingAr.slice(0, 10));

