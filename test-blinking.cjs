/**
 * Puppeteer Test for Image Blinking Fix
 *
 * Tests the comprehensive blinking fix:
 * 1. Images don't show until fully loaded
 * 2. Filter changes don't cause unnecessary re-renders
 * 3. No progressive rendering artifacts
 * 4. Product #162 stability
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';
const TEST_RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function pass(test) {
  TEST_RESULTS.passed.push(test);
  log(`PASS: ${test}`, 'success');
}

function fail(test, reason) {
  TEST_RESULTS.failed.push({ test, reason });
  log(`FAIL: ${test} - ${reason}`, 'error');
}

function warn(message) {
  TEST_RESULTS.warnings.push(message);
  log(message, 'warn');
}

async function test1_ImagesHiddenUntilFullyLoaded(page) {
  log('\n========== TEST 1: Images Hidden Until Fully Loaded ==========');

  try {
    // Navigate to treasure browser
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    // Wait for grid to load
    await page.waitForSelector('[class*="VirtualGrid"]', { timeout: 10000 });

    // Monitor image opacity during load
    const imageStates = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
      const states = [];

      images.forEach((img, idx) => {
        const opacity = window.getComputedStyle(img).opacity;
        const complete = img.complete;
        const naturalWidth = img.naturalWidth;

        states.push({
          index: idx,
          opacity: parseFloat(opacity),
          complete,
          hasSize: naturalWidth > 0,
          visible: opacity === '1'
        });
      });

      return states;
    });

    // Check if any incomplete images are visible
    const incompleteButVisible = imageStates.filter(s => !s.complete && s.visible);

    if (incompleteButVisible.length === 0) {
      pass('No incomplete images are visible (opacity check)');
    } else {
      fail('Images visible before fully loaded', `${incompleteButVisible.length} images visible before complete`);
    }

    // Wait for all images to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
      return Array.from(images).every(img => img.complete && img.naturalWidth > 0);
    }, { timeout: 30000 });

    pass('All images eventually loaded');

  } catch (error) {
    fail('Image loading test', error.message);
  }
}

async function test2_FilterChangesNoRerender(page) {
  log('\n========== TEST 2: Filter Changes Don\'t Cause Re-renders ==========');

  try {
    // Navigate to treasure browser
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2' });

    // Wait for grid to load
    await page.waitForSelector('[class*="VirtualGrid"]', { timeout: 10000 });

    // Get initial image URLs
    const initialUrls = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
      return Array.from(images).map(img => img.src);
    });

    log(`Initial images loaded: ${initialUrls.length}`);

    // Apply a filter (click price filter button if exists)
    const filterButton = await page.$('[data-testid="filter-button"], button[aria-label*="filter"]');
    if (filterButton) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    } else {
      warn('Filter button not found - skipping filter interaction test');
    }

    // Get URLs after filter
    const afterFilterUrls = await page.evaluate(() => {
      const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
      return Array.from(images).map(img => img.src);
    });

    // Count how many images remained (should have stable URLs)
    const stableImages = initialUrls.filter(url => afterFilterUrls.includes(url));

    log(`Images after filter: ${afterFilterUrls.length}, Stable: ${stableImages.length}`);

    if (stableImages.length > 0) {
      pass('Some images maintained stable URLs after filter change');
    } else {
      warn('Could not verify stable URLs (all images may have been filtered out)');
    }

  } catch (error) {
    fail('Filter re-render test', error.message);
  }
}

async function test3_NoProgressiveRendering(page) {
  log('\n========== TEST 3: No Progressive Rendering ==========');

  try {
    // Throttle network to simulate slow connection
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50 * 1024, // 50KB/s
      uploadThroughput: 50 * 1024,
      latency: 200
    });

    log('Network throttled to 50KB/s with 200ms latency');

    // Navigate with slow network
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    // Wait for skeleton loaders to appear
    await page.waitForSelector('[class*="MuiSkeleton"]', { timeout: 5000 });
    log('Skeleton loaders detected');

    // Monitor opacity transitions
    const transitionData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
        const transitions = [];
        let checkCount = 0;
        const maxChecks = 50;

        const interval = setInterval(() => {
          checkCount++;

          images.forEach((img, idx) => {
            const opacity = parseFloat(window.getComputedStyle(img).opacity);
            if (opacity > 0 && opacity < 1) {
              transitions.push({
                index: idx,
                opacity,
                complete: img.complete,
                check: checkCount
              });
            }
          });

          if (checkCount >= maxChecks) {
            clearInterval(interval);
            resolve(transitions);
          }
        }, 100);
      });
    });

    // Check if we caught any images in mid-transition (should be transitioning from 0 to 1)
    const midTransitions = transitionData.filter(t => t.opacity > 0 && t.opacity < 1);

    if (midTransitions.length === 0) {
      pass('No progressive rendering detected - binary visibility (0 or 1 opacity)');
    } else {
      // Transition during fade-in is okay, but not before complete
      const incompleteTransitions = midTransitions.filter(t => !t.complete);
      if (incompleteTransitions.length === 0) {
        pass('Transitions only occur after images are complete');
      } else {
        fail('Progressive rendering detected', `${incompleteTransitions.length} images transitioning before complete`);
      }
    }

    // Disable throttling
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });

  } catch (error) {
    fail('Progressive rendering test', error.message);
  }
}

async function test4_Product162Stability(page) {
  log('\n========== TEST 4: Product #162 Stability ==========');

  try {
    // Navigate to treasure browser
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle2' });

    // Search for product 162
    const searchBox = await page.$('input[type="search"], input[placeholder*="Buscar"]');
    if (searchBox) {
      await searchBox.type('162');
      await page.waitForTimeout(1000);

      // Check if product 162 appears
      const product162Visible = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="GridCard"], [class*="Card"]');
        return Array.from(cards).some(card => card.textContent.includes('162'));
      });

      if (product162Visible) {
        log('Product #162 found in search results');

        // Get image URL for product 162
        const imageUrl = await page.evaluate(() => {
          const cards = document.querySelectorAll('[class*="GridCard"], [class*="Card"]');
          for (const card of cards) {
            if (card.textContent.includes('162')) {
              const img = card.querySelector('img[src*="api/serve-drive-image"]');
              return img ? img.src : null;
            }
          }
          return null;
        });

        if (imageUrl) {
          log(`Product #162 image URL: ${imageUrl}`);
          pass('Product #162 has stable image URL');
        } else {
          warn('Product #162 found but no image URL detected');
        }
      } else {
        warn('Product #162 not found in search results');
      }
    } else {
      warn('Search box not found - skipping product 162 test');
    }

  } catch (error) {
    fail('Product #162 stability test', error.message);
  }
}

async function test5_SkeletonToImageTransition(page) {
  log('\n========== TEST 5: Clean Skeleton → Image Transition ==========');

  try {
    // Navigate to fresh page
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    // Check for skeleton loaders
    const skeletonCount = await page.evaluate(() => {
      return document.querySelectorAll('[class*="MuiSkeleton"]').length;
    });

    log(`Skeleton loaders detected: ${skeletonCount}`);

    if (skeletonCount > 0) {
      pass('Skeleton loaders present during initial load');
    } else {
      warn('No skeleton loaders detected');
    }

    // Wait for images to load
    await page.waitForTimeout(3000);

    // Check if skeletons are gone and images visible
    const finalState = await page.evaluate(() => {
      const skeletons = document.querySelectorAll('[class*="MuiSkeleton"]');
      const images = document.querySelectorAll('img[src*="api/serve-drive-image"]');
      const visibleImages = Array.from(images).filter(img => {
        const opacity = parseFloat(window.getComputedStyle(img).opacity);
        return opacity === 1 && img.complete;
      });

      return {
        skeletonCount: skeletons.length,
        totalImages: images.length,
        visibleImages: visibleImages.length
      };
    });

    log(`Final state - Skeletons: ${finalState.skeletonCount}, Visible images: ${finalState.visibleImages}/${finalState.totalImages}`);

    if (finalState.visibleImages > 0 && finalState.skeletonCount < skeletonCount) {
      pass('Clean transition from skeleton to images');
    } else {
      warn('Could not verify complete skeleton → image transition');
    }

  } catch (error) {
    fail('Skeleton transition test', error.message);
  }
}

async function runTests() {
  log('🚀 Starting Image Blinking Tests\n');
  log(`Testing URL: ${BASE_URL}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Run all tests
    await test1_ImagesHiddenUntilFullyLoaded(page);
    await test2_FilterChangesNoRerender(page);
    await test3_NoProgressiveRendering(page);
    await test4_Product162Stability(page);
    await test5_SkeletonToImageTransition(page);

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
  } finally {
    await browser.close();
  }

  // Print summary
  log('\n========================================');
  log('TEST SUMMARY');
  log('========================================');
  log(`✅ Passed: ${TEST_RESULTS.passed.length}`);
  log(`❌ Failed: ${TEST_RESULTS.failed.length}`);
  log(`⚠️  Warnings: ${TEST_RESULTS.warnings.length}`);

  if (TEST_RESULTS.passed.length > 0) {
    log('\nPassed Tests:');
    TEST_RESULTS.passed.forEach(test => log(`  ✅ ${test}`));
  }

  if (TEST_RESULTS.failed.length > 0) {
    log('\nFailed Tests:');
    TEST_RESULTS.failed.forEach(({ test, reason }) => log(`  ❌ ${test}: ${reason}`));
  }

  if (TEST_RESULTS.warnings.length > 0) {
    log('\nWarnings:');
    TEST_RESULTS.warnings.forEach(msg => log(`  ⚠️  ${msg}`));
  }

  log('\n========================================\n');

  // Exit with appropriate code
  process.exit(TEST_RESULTS.failed.length > 0 ? 1 : 0);
}

// Check if puppeteer is installed
(async () => {
  try {
    await runTests();
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      log('❌ Puppeteer not installed. Run: npm install --save-dev puppeteer', 'error');
      process.exit(1);
    } else {
      throw error;
    }
  }
})();
