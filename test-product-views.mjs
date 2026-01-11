/**
 * Puppeteer Test: Product Views Tracking
 *
 * Tests the product view tracking flow:
 * 1. Navigate to treasure browser
 * 2. Click on a product to view details
 * 3. Verify the view tracking API is called
 * 4. Check if view counts appear on cards
 * 5. Visit admin analytics to see dashboard
 */

import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const TIMEOUT = 30000;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  dim: '\x1b[2m',
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    step: `${colors.dim}→${colors.reset}`,
  };
  console.log(`${prefix[type] || prefix.info} ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProductViews() {
  log('Starting Product Views Test Suite', 'info');
  console.log('');

  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI
    slowMo: 50,
    args: ['--window-size=390,844'], // iPhone 12 size
    defaultViewport: {
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    },
  });

  const page = await browser.newPage();

  // Track API calls
  const apiCalls = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      apiCalls.push({
        url,
        method: request.method(),
        postData: request.postData(),
      });
    }
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      try {
        const json = await response.json();
        log(`API Response ${url}: ${JSON.stringify(json).substring(0, 100)}...`, 'step');
      } catch {
        // Not JSON response
      }
    }
  });

  try {
    // =========================================================================
    // TEST 1: Navigate to Treasure Browser
    // =========================================================================
    log('TEST 1: Navigate to Treasure Browser', 'info');

    await page.goto(`${BASE_URL}/treasure`, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT,
    });

    await sleep(2000); // Wait for data to load

    // Check if treasure items are loaded
    const treasureCards = await page.$$('[role="article"]');
    if (treasureCards.length > 0) {
      log(`Found ${treasureCards.length} treasure cards`, 'success');
    } else {
      log('No treasure cards found!', 'error');
    }

    // =========================================================================
    // TEST 2: Click on a Product to View Details
    // =========================================================================
    log('TEST 2: Click on first product to view details', 'info');

    // Click the first treasure card
    const firstCard = treasureCards[0];
    if (firstCard) {
      await firstCard.click();
      await sleep(3000); // Wait for navigation and API call

      // Check if we're on a product detail page
      const currentUrl = page.url();
      if (currentUrl.includes('/product/')) {
        log(`Navigated to product page: ${currentUrl}`, 'success');
      } else {
        log(`Expected /product/ URL, got: ${currentUrl}`, 'error');
      }
    }

    // =========================================================================
    // TEST 3: Verify View Tracking API Call
    // =========================================================================
    log('TEST 3: Verify view tracking API was called', 'info');

    const trackViewCall = apiCalls.find(call =>
      call.url.includes('track-product-view') && call.method === 'POST'
    );

    if (trackViewCall) {
      log('track-product-view API was called', 'success');
      if (trackViewCall.postData) {
        const data = JSON.parse(trackViewCall.postData);
        log(`  itemId: ${data.itemId}`, 'step');
        log(`  productName: ${data.productName}`, 'step');
        log(`  sessionId: ${data.sessionId}`, 'step');
      }
    } else {
      log('track-product-view API was NOT called', 'warn');
      log('This is expected if running locally without Vercel functions', 'step');
    }

    // =========================================================================
    // TEST 4: Go back and check for view count badges
    // =========================================================================
    log('TEST 4: Go back to treasure and check view counts', 'info');

    await page.goBack();
    await sleep(2000);

    // Look for Eye icons (view count badges)
    const viewBadges = await page.$$('svg.lucide-eye');
    if (viewBadges.length > 0) {
      log(`Found ${viewBadges.length} view count badges on cards`, 'success');
    } else {
      log('No view count badges visible (expected if no views recorded yet)', 'info');
    }

    // =========================================================================
    // TEST 5: Visit Admin Analytics (if accessible)
    // =========================================================================
    log('TEST 5: Navigate to Admin Analytics', 'info');

    await page.goto(`${BASE_URL}/admin/analytics`, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT,
    });

    await sleep(2000);

    // Check for Product Views section
    const pageContent = await page.content();
    if (pageContent.includes('Product Views')) {
      log('Product Views section found in analytics', 'success');
    } else {
      log('Product Views section not found (may require admin access)', 'warn');
    }

    // Check for get-product-views API call
    const getViewsCall = apiCalls.find(call =>
      call.url.includes('get-product-views') && call.method === 'GET'
    );

    if (getViewsCall) {
      log('get-product-views API was called', 'success');
    } else {
      log('get-product-views API was NOT called', 'warn');
    }

    // =========================================================================
    // TEST 6: Session Deduplication
    // =========================================================================
    log('TEST 6: Test session deduplication', 'info');

    // Clear tracked calls
    const callsBefore = apiCalls.length;

    // Visit the same product again
    await page.goto(`${BASE_URL}/treasure`, { waitUntil: 'networkidle2' });
    await sleep(1000);

    const cards = await page.$$('[role="article"]');
    if (cards.length > 0) {
      await cards[0].click();
      await sleep(2000);
    }

    // Count new track-view calls
    const newTrackCalls = apiCalls.slice(callsBefore).filter(call =>
      call.url.includes('track-product-view') && call.method === 'POST'
    );

    if (newTrackCalls.length === 0) {
      log('No duplicate view tracked (session dedup working)', 'success');
    } else {
      log(`${newTrackCalls.length} duplicate view(s) tracked (dedup may not be working)`, 'warn');
    }

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('');
    log('=== TEST SUMMARY ===', 'info');
    log(`Total API calls made: ${apiCalls.length}`, 'step');

    const trackCalls = apiCalls.filter(c => c.url.includes('track-product-view'));
    const getCalls = apiCalls.filter(c => c.url.includes('get-product-views'));

    log(`track-product-view calls: ${trackCalls.length}`, 'step');
    log(`get-product-views calls: ${getCalls.length}`, 'step');

    console.log('');
    log('Tests completed! Review the results above.', 'success');

    // Keep browser open for manual inspection
    log('Browser will close in 10 seconds...', 'info');
    await sleep(10000);

  } catch (error) {
    log(`Test error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await browser.close();
  }
}

// Run the test
testProductViews().catch(console.error);
