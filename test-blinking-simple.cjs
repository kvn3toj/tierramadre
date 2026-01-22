/**
 * Simple Puppeteer Test for Image Blinking Fix
 * Captures screenshots and basic metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = './test-screenshots';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function captureScreenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  log(`Screenshot saved: ${filepath}`, 'info');
  return filepath;
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function test1_BasicPageLoad(browser) {
  log('\n========== TEST 1: Basic Page Load ==========');
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate to home page
    log('Navigating to homepage...');
    const response = await page.goto(BASE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    log(`Page loaded with status: ${response.status()}`);

    // Wait a bit for React to render
    await wait(2000);

    // Take initial screenshot
    await captureScreenshot(page, '01-initial-load');

    // Check if images are present
    const imageCount = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      return images.length;
    });

    log(`Found ${imageCount} images on page`);

    // Check page title
    const title = await page.title();
    log(`Page title: ${title}`);

    log('✅ Basic page load successful', 'success');

  } catch (error) {
    log(`Basic page load failed: ${error.message}`, 'error');
    await captureScreenshot(page, '01-error');
  } finally {
    await page.close();
  }
}

async function test2_ImageLoadingWithThrottle(browser) {
  log('\n========== TEST 2: Image Loading with Network Throttle ==========');
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    // Apply network throttling
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 100 * 1024, // 100KB/s
      uploadThroughput: 100 * 1024,
      latency: 100
    });

    log('Network throttled to 100KB/s with 100ms latency');

    // Navigate
    log('Loading page with throttled network...');
    await page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Take screenshot immediately after load
    await wait(1000);
    await captureScreenshot(page, '02-throttled-initial');

    // Wait for images to start loading
    await wait(3000);
    await captureScreenshot(page, '02-throttled-loading');

    // Check image states
    const imageStates = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let loading = 0;
      let loaded = 0;
      let visible = 0;

      images.forEach(img => {
        if (!img.complete) loading++;
        else loaded++;

        const opacity = window.getComputedStyle(img).opacity;
        if (parseFloat(opacity) > 0.5) visible++;
      });

      return { total: images.length, loading, loaded, visible };
    });

    log(`Images - Total: ${imageStates.total}, Loading: ${imageStates.loading}, Loaded: ${imageStates.loaded}, Visible: ${imageStates.visible}`);

    // Wait more for images to finish
    await wait(5000);
    await captureScreenshot(page, '02-throttled-complete');

    // Check final state
    const finalStates = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let visible = 0;
      let hidden = 0;

      images.forEach(img => {
        const opacity = window.getComputedStyle(img).opacity;
        if (parseFloat(opacity) > 0.5) visible++;
        else hidden++;
      });

      return { total: images.length, visible, hidden };
    });

    log(`Final state - Visible: ${finalStates.visible}, Hidden: ${finalStates.hidden}`);

    if (finalStates.visible > 0) {
      log('✅ Images eventually became visible', 'success');
    }

  } catch (error) {
    log(`Throttled loading test failed: ${error.message}`, 'error');
    await captureScreenshot(page, '02-error');
  } finally {
    await page.close();
  }
}

async function test3_ImageOpacityCheck(browser) {
  log('\n========== TEST 3: Image Opacity During Load ==========');
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    // Start monitoring before navigation
    const opacitySnapshots = [];

    // Navigate
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Take opacity snapshots over time
    for (let i = 0; i < 10; i++) {
      await wait(500);

      const snapshot = await page.evaluate(() => {
        const images = document.querySelectorAll('img[src*="api"], img[src*="drive"]');
        const opacities = [];

        images.forEach((img, idx) => {
          if (idx < 10) { // Only check first 10 images
            const opacity = parseFloat(window.getComputedStyle(img).opacity);
            const complete = img.complete;
            opacities.push({ opacity, complete });
          }
        });

        return opacities;
      });

      opacitySnapshots.push(snapshot);
    }

    // Analyze snapshots
    let partiallyVisible = 0;
    let fullyHidden = 0;
    let fullyVisible = 0;

    opacitySnapshots.forEach((snapshot, time) => {
      snapshot.forEach(img => {
        if (!img.complete && img.opacity > 0 && img.opacity < 1) {
          partiallyVisible++;
        } else if (img.opacity === 0) {
          fullyHidden++;
        } else if (img.opacity === 1) {
          fullyVisible++;
        }
      });
    });

    log(`Opacity analysis over 5 seconds:`);
    log(`  - Fully hidden (opacity: 0): ${fullyHidden} observations`);
    log(`  - Partially visible (0 < opacity < 1): ${partiallyVisible} observations`);
    log(`  - Fully visible (opacity: 1): ${fullyVisible} observations`);

    if (partiallyVisible === 0 || partiallyVisible < fullyHidden / 10) {
      log('✅ Images maintain binary visibility (0 or 1 opacity)', 'success');
    } else {
      log('⚠️  Some images may be showing progressive rendering', 'warn');
    }

    await captureScreenshot(page, '03-opacity-final');

  } catch (error) {
    log(`Opacity check failed: ${error.message}`, 'error');
    await captureScreenshot(page, '03-error');
  } finally {
    await page.close();
  }
}

async function test4_SkeletonPresence(browser) {
  log('\n========== TEST 4: Skeleton Loader Presence ==========');
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate with slow network
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024,
      uploadThroughput: 50 * 1024,
      latency: 200
    });

    log('Loading page with slow network to observe skeletons...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    await wait(1000);

    // Check for skeleton loaders
    const skeletonCheck = await page.evaluate(() => {
      const skeletons = document.querySelectorAll('[class*="Skeleton"], [class*="skeleton"]');
      return {
        count: skeletons.length,
        hasAny: skeletons.length > 0
      };
    });

    log(`Skeleton loaders found: ${skeletonCheck.count}`);

    if (skeletonCheck.count > 0) {
      await captureScreenshot(page, '04-with-skeletons');
      log('✅ Skeleton loaders detected during load', 'success');
    } else {
      await captureScreenshot(page, '04-no-skeletons');
      log('⚠️  No skeleton loaders found', 'warn');
    }

  } catch (error) {
    log(`Skeleton check failed: ${error.message}`, 'error');
    await captureScreenshot(page, '04-error');
  } finally {
    await page.close();
  }
}

async function test5_NetworkRequests(browser) {
  log('\n========== TEST 5: Image Network Requests ==========');
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 800 });

    const imageRequests = [];

    // Monitor network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('api/serve-drive-image') || url.includes('.jpg') || url.includes('.png')) {
        imageRequests.push({
          url: url.substring(0, 100), // Truncate for logging
          time: Date.now()
        });
      }
    });

    log('Monitoring image requests...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });

    await wait(2000);

    log(`Total image requests: ${imageRequests.length}`);

    // Check for duplicates
    const urls = imageRequests.map(r => r.url);
    const uniqueUrls = new Set(urls);
    const duplicates = urls.length - uniqueUrls.size;

    log(`Unique URLs: ${uniqueUrls.size}`);
    log(`Duplicate requests: ${duplicates}`);

    if (duplicates === 0) {
      log('✅ No duplicate image requests detected', 'success');
    } else {
      log(`⚠️  ${duplicates} duplicate image requests found`, 'warn');
    }

    await captureScreenshot(page, '05-network-complete');

  } catch (error) {
    log(`Network request test failed: ${error.message}`, 'error');
    await captureScreenshot(page, '05-error');
  } finally {
    await page.close();
  }
}

async function runTests() {
  log('🚀 Starting Image Blinking Tests (Simplified)\n');
  log(`Testing URL: ${BASE_URL}`);
  log(`Screenshots will be saved to: ${SCREENSHOT_DIR}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  try {
    await test1_BasicPageLoad(browser);
    await test2_ImageLoadingWithThrottle(browser);
    await test3_ImageOpacityCheck(browser);
    await test4_SkeletonPresence(browser);
    await test5_NetworkRequests(browser);

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }

  log('\n========================================');
  log('TEST COMPLETE');
  log('========================================');
  log(`Review screenshots in: ${SCREENSHOT_DIR}`);
  log('========================================\n');
}

runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
