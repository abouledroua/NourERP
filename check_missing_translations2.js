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
    if (key.startsWith('/') || ['input', 'change'].includes(key) || key.includes(' ')) continue;
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

console.log('Missing EN:');
console.log(missingEn);

console.log('Missing FR:');
console.log(missingFr);

console.log('Missing AR:');
console.log(missingAr);
