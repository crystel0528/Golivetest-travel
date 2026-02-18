// tools/orphan-detector/list-orphan-urls-clean.ts
import fs from 'fs';
import path from 'path';
import chalk from 'chalk'; // optional, for colors

// Path to the orphan report
const reportPath = path.join(__dirname, 'reports', 'orphan-pages-report.json');

if (!fs.existsSync(reportPath)) {
  console.error(chalk.red('❌ Orphan report not found:'), reportPath);
  process.exit(1);
}

const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
const visitedPages: string[] = reportData.totalPages || [];
const orphanPages: string[] = reportData.orphanPages || [];

console.log(chalk.blue('========== Visited Pages ==========\n'));
visitedPages.forEach((url, i) => console.log(`${i + 1}. ${url}`));
console.log(chalk.green(`\nTotal pages visited: ${visitedPages.length}\n`));

console.log(chalk.blue('========== Orphan Pages ==========\n'));
if (orphanPages.length === 0) {
  console.log(chalk.green('✅ No orphan pages found.'));
} else {
  orphanPages.forEach((url, i) => console.log(`${i + 1}. ${chalk.red(url)}`));
}
console.log(chalk.yellow(`\nTotal orphan pages: ${orphanPages.length}`));
console.log(chalk.blue('===============================\n'));
