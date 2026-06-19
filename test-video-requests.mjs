/**
 * Puppeteer test: verify each video (.mp4) is fetched only ONCE
 * from the network on the Collection page.
 *
 * Usage:  node test-video-requests.mjs [url]
 * Default URL: https://tierramadre.app/c/ceo-tierra-madre
 */
import puppeteer from 'puppeteer';

const TARGET = process.argv[2] || 'https://tierramadre.app/c/ceo-tierra-madre';
const WAIT_SECONDS = 20; // wait for splash + preloading to finish

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Track every .mp4 network request
  const videoRequests = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('.mp4')) {
      videoRequests.push({
        url,
        filename: url.split('/').pop().split('?')[0].split('#')[0],
        method: req.method(),
        headers: req.headers(),
      });
    }
  });

  console.log(`\nNavigating to: ${TARGET}`);
  console.log(`Waiting ${WAIT_SECONDS}s for splash + video preload...\n`);

  await page.goto(TARGET, { waitUntil: 'networkidle0', timeout: 60000 });

  // Extra wait to capture any late requests after splash screen
  await new Promise(r => setTimeout(r, WAIT_SECONDS * 1000));

  // Group by filename
  const byFile = {};
  for (const req of videoRequests) {
    const key = req.filename;
    if (!byFile[key]) byFile[key] = [];
    byFile[key].push(req.url);
  }

  // Report
  console.log('=== VIDEO REQUEST REPORT ===\n');
  let totalRequests = 0;
  let hasDuplicates = false;

  const sortedFiles = Object.keys(byFile).sort();
  for (const file of sortedFiles) {
    const count = byFile[file].length;
    totalRequests += count;
    const status = count === 1 ? 'OK' : `DUPLICATE (${count}x)`;
    if (count > 1) hasDuplicates = true;
    console.log(`  ${file}: ${count} request(s)  ${status}`);
  }

  console.log(`\nTotal .mp4 requests: ${totalRequests}`);
  console.log(`Unique videos:       ${sortedFiles.length}`);
  console.log(`Duplicates found:    ${hasDuplicates ? 'YES' : 'NO'}\n`);

  if (hasDuplicates) {
    console.log('FAIL: Some videos were fetched more than once.');
    process.exitCode = 1;
  } else {
    console.log('PASS: Each video fetched exactly once.');
  }

  await browser.close();
})();
