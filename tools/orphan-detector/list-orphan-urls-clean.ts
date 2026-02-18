// tools/orphan-detector/list-orphan-urls-clean.ts
import fs from 'fs';
import path from 'path';

// Path to the orphan pages JSON report
const reportPath = path.join(__dirname, 'reports', 'orphan-pages-report.json');

// Check if the report exists
if (!fs.existsSync(reportPath)) {
  console.error('❌ Orphan report not found:', reportPath);
  process.exit(1);
}

// Read and parse the JSON report
const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Extract visited pages and orphan pages
const visitedPages: string[] = reportData.totalPages || [];
const orphanPages: string[] = reportData.orphanPages || [];

// Display the results
console.log('========== Visited Pages ==========');
visitedPages.forEach(url => console.log(url));
console.log('Total pages visited:', visitedPages.length);

console.log('\n========== Orphan Pages ==========');
if (orphanPages.length === 0) {
  console.log('✅ No orphan pages found.');
} else {
  orphanPages.forEach(url => console.log(url));
}
console.log('Total orphan pages:', orphanPages.length);
console.log('===============================');
