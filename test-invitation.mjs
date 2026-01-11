/**
 * Puppeteer Test - Guest Invitation Flow
 *
 * Tests the complete invitation generation and guest access flow.
 */

import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInvitationFlow() {
  console.log('🚀 Starting Invitation Flow Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });

    // Step 1: Go to home page
    console.log('1️⃣ Navigating to home page...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await delay(2000);

    await page.screenshot({ path: 'test-screenshots/01-home.png' });
    console.log('   ✅ Home page loaded\n');

    // Step 2: Test the API directly
    console.log('2️⃣ Testing generate-invitation API...');
    const apiResponse = await page.evaluate(async () => {
      const res = await fetch('/api/generate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@tierramadre.co',
          pricingMode: 'with_prices',
        }),
      });
      return res.json();
    });

    console.log('   API Response:', JSON.stringify(apiResponse, null, 2));

    if (apiResponse.success) {
      console.log('\n   ✅ Invitation generated successfully!');
      console.log(`   📎 URL: ${apiResponse.url}`);
      console.log(`   📎 Short URL: ${apiResponse.shortUrl}`);
      console.log(`   📎 Short Code: ${apiResponse.shortCode}`);
      console.log(`   💰 Pricing Mode: ${apiResponse.pricingMode}`);
      console.log(`   ⏱️ Duration: ${apiResponse.durationHours} hours\n`);

      // Step 3: Test the invitation link in a new incognito context
      console.log('3️⃣ Testing invitation link as guest...');

      const incognitoContext = await browser.createBrowserContext();
      const guestPage = await incognitoContext.newPage();

      await guestPage.goto(apiResponse.url, { waitUntil: 'networkidle0' });
      await delay(2000);

      await guestPage.screenshot({ path: 'test-screenshots/02-guest-form.png' });
      console.log('   ✅ Guest invitation page loaded\n');

      // Step 4: Fill in guest form
      console.log('4️⃣ Filling guest registration form...');

      // Find and fill name input
      const nameInput = await guestPage.$('input');
      if (nameInput) {
        await nameInput.click();
        await nameInput.type('Test Guest');
        console.log('   ✅ Name filled');
      }

      await delay(500);

      // Find and fill email input
      const emailInput = await guestPage.$('input[type="email"]');
      if (emailInput) {
        await emailInput.click();
        await emailInput.type('guest@test.com');
        console.log('   ✅ Email filled');
      }

      await delay(500);
      await guestPage.screenshot({ path: 'test-screenshots/03-form-filled.png' });

      // Step 5: Submit the form
      console.log('\n5️⃣ Submitting guest form...');

      // Find submit button by evaluating text content
      const submitClicked = await guestPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const submitBtn = buttons.find(b => b.textContent?.includes('Explorar'));
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
        return false;
      });

      if (submitClicked) {
        console.log('   ✅ Submit button clicked');
        await delay(3000);
      } else {
        console.log('   ⚠️ Submit button not found');
      }

      await guestPage.screenshot({ path: 'test-screenshots/04-after-submit.png' });

      // Step 6: Check current URL and status
      const currentUrl = guestPage.url();
      console.log(`   📍 Current URL: ${currentUrl}\n`);

      // Step 7: Navigate to treasure to verify access
      console.log('6️⃣ Verifying guest can browse products...');
      await guestPage.goto(`${BASE_URL}/treasure`, { waitUntil: 'networkidle0' });
      await delay(2000);

      await guestPage.screenshot({ path: 'test-screenshots/05-treasure-browse.png' });
      console.log('   ✅ Treasure page loaded\n');

      // Step 8: Test short link if available
      if (apiResponse.shortUrl) {
        console.log('7️⃣ Testing short link...');
        const shortLinkPage = await incognitoContext.newPage();
        await shortLinkPage.goto(apiResponse.shortUrl, { waitUntil: 'networkidle0' });
        await delay(2000);

        await shortLinkPage.screenshot({ path: 'test-screenshots/06-short-link.png' });
        console.log(`   📍 Short link redirected to: ${shortLinkPage.url()}\n`);
      }

      await incognitoContext.close();

    } else {
      console.log('   ❌ API Error:', apiResponse.error);
      if (apiResponse.message) {
        console.log('   Message:', apiResponse.message);
      }
    }

    console.log('✅ Test completed! Check test-screenshots/ folder for results.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await delay(5000);
    await browser.close();
  }
}

// Create screenshots directory
import { mkdir } from 'fs/promises';
await mkdir('test-screenshots', { recursive: true });

// Run the test
testInvitationFlow();
