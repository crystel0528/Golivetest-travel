// tools/orphan-detector/open-orphan-urls.ts
import fs from 'fs';
import path from 'path';
import open from 'open'; // npm install open

// Path to the orphan pages JSON report
const reportPath = path.join(__dirname, 'reports', 'orphan-pages-report.json');

// Check if the report exists
if (!fs.existsSync(reportPath)) {
  console.error('❌ Orphan report not found:', reportPath);
  process.exit(1);
}

// Read and parse the JSON report
const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const orphanPages: string[] = reportData.orphanPages || [];

if (orphanPages.length === 0) {
  console.log('✅ No orphan pages found.');
} else {
  console.log(`Opening ${orphanPages.length} orphan page(s) in your browser...`);
  orphanPages.forEach(async url => {
    console.log('Opening:', url);
    await open(url); // Opens in default browser
  });
}
