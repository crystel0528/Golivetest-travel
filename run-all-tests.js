const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');


// ========================
// 1️⃣ Run all K6 tests
// ========================
async function runK6Tests() {
  const k6Folder = path.join(__dirname, 'dist', 'k6');
  if (!fs.existsSync(k6Folder)) {
    console.log('No K6 scripts found in dist/k6/');
    return;
  }


  const files = fs.readdirSync(k6Folder).filter(f => f.endsWith('.js'));
  if (!files.length) {
    console.log('No K6 scripts to run.');
    return;
  }


  for (const file of files) {
    console.log(`\n➡ Running K6 test: ${file}`);
    await new Promise((resolve) => {
      const k6Process = exec(`k6 run "${path.join(k6Folder, file)}"`);
      k6Process.stdout.on('data', data => process.stdout.write(data));
      k6Process.stderr.on('data', data => process.stderr.write(data));
      k6Process.on('close', resolve);
    });
  }
}


// ========================
// 2️⃣ Run Playwright tests
// ========================
async function runPlaywrightTests() {
  console.log(`\n➡ Running Playwright tests`);
  await new Promise((resolve) => {
    const pwProcess = exec(`npx playwright test`);
    pwProcess.stdout.on('data', data => process.stdout.write(data));
    pwProcess.stderr.on('data', data => process.stderr.write(data));
    pwProcess.on('close', resolve);
  });
}


// ========================
// 3️⃣ Run everything
// ========================
(async function runAll() {
  console.log('===== STARTING ALL TESTS =====');
  await runK6Tests();
  await runPlaywrightTests();
  console.log('===== ALL TESTS FINISHED =====');
})();
