//import fs from 'fs';

//export default async function globalSetup() {
//if (fs.existsSync('test-results')) {
  //fs.rmSync('test-results', { recursive: true, force: true });
// }

 //process.env.BASE_URL = 'https://dev.travelinsider.co/';
//}
import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  // Create results folder if it doesn't exist
  const resultsPath = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(resultsPath)) fs.mkdirSync(resultsPath, { recursive: true });

  // Set BASE_URL
  process.env.BASE_URL = 'https://dev.travelinsider.co/';

  // Print the HTML report link AFTER the tests
  const reportPath = path.join(__dirname, '../playwright-report');
  console.log(`\n✅ Playwright HTML report will be here: file://${reportPath}\n`);
}

export default globalSetup;
