const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Check if we need to add imports
  const needsDate = /<input[^>]+type=["']date["'][^>]*>/.test(content);
  const needsTime = /<input[^>]+type=["']time["'][^>]*>/.test(content);
  
  if (!needsDate && !needsTime) return;

  // Add imports if not present
  if (needsDate && !content.includes('import DateInput')) {
    // Find last import statement
    const importRegex = /import [^;]+;/g;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    if (lastImportMatch) {
      const pos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, pos) + "\nimport DateInput from '../components/DateInput';" + content.slice(pos);
    }
  }

  if (needsTime && !content.includes('import TimeInput')) {
    const importRegex = /import [^;]+;/g;
    let lastImportMatch;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportMatch = match;
    }
    if (lastImportMatch) {
      const pos = lastImportMatch.index + lastImportMatch[0].length;
      content = content.slice(0, pos) + "\nimport TimeInput from '../components/TimeInput';" + content.slice(pos);
    }
  }

  // Replace tags
  content = content.replace(/<input([^>]*?)type=["']date["']([^>]*)>/g, '<DateInput$1$2/>');
  content = content.replace(/<input([^>]*?)type=["']time["']([^>]*)>/g, '<TimeInput$1$2/>');

  // Fix self-closing tags if they were self-closing before
  content = content.replace(/<DateInput([^>]*?)\/\/\s*>/g, '<DateInput$1/>');
  content = content.replace(/<TimeInput([^>]*?)\/\/\s*>/g, '<TimeInput$1/>');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  }
};

const pagesDir = 'frontend/src/pages';
const compDir = 'frontend/src/components';

fs.readdirSync(pagesDir).forEach(f => {
  if (f.endsWith('.jsx')) replaceInFile(path.join(pagesDir, f));
});

fs.readdirSync(compDir).forEach(f => {
  if (f.endsWith('.jsx') && f !== 'DateInput.jsx' && f !== 'TimeInput.jsx') {
    replaceInFile(path.join(compDir, f));
  }
});
