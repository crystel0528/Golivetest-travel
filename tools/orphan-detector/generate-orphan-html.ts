// tools/orphan-detector/generate-orphan-html.ts
import fs from 'fs';
import path from 'path';

const jsonReportPath = path.join(__dirname, 'reports', 'orphan-pages-report.json');
const htmlReportPath = path.join(__dirname, 'reports', 'orphan-pages-report.html');

// Check if the JSON report exists
if (!fs.existsSync(jsonReportPath)) {
  console.error('❌ Orphan JSON report not found:', jsonReportPath);
  process.exit(1);
}

// Read the JSON report
const reportData = JSON.parse(fs.readFileSync(jsonReportPath, 'utf-8'));
const visitedPages: string[] = reportData.totalPages || [];
const orphanPages: string[] = reportData.orphanPages || [];

// Generate simple HTML content
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Orphan Pages Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #555; }
    ul { line-height: 1.6; }
    .orphan { color: red; font-weight: bold; }
    .visited { color: green; }
  </style>
</head>
<body>
  <h1>Orphan Pages Report</h1>

  <h2>Visited Pages (${visitedPages.length})</h2>
  <ul>
    ${visitedPages.map(url => `<li class="visited"><a href="${url}" target="_blank">${url}</a></li>`).join('\n')}
  </ul>

  <h2>Orphan Pages (${orphanPages.length})</h2>
  <ul>
    ${
      orphanPages.length > 0
        ? orphanPages.map(url => `<li class="orphan"><a href="${url}" target="_blank">${url}</a></li>`).join('\n')
        : `<li>✅ No orphan pages found</li>`
    }
  </ul>
</body>
</html>
`;

// Ensure reports folder exists
fs.mkdirSync(path.dirname(htmlReportPath), { recursive: true });

// Write HTML file
fs.writeFileSync(htmlReportPath, htmlContent);

console.log('✅ HTML report generated at:', htmlReportPath);
