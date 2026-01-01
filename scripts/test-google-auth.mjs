#!/usr/bin/env node
/**
 * Manual Google Auth Test
 *
 * Opens a browser for you to manually test the Google Sign-In flow.
 * The browser stays open so you can interact with Google's auth.
 */

import { chromium } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'https://tierra-madre-studio.vercel.app';

async function testGoogleAuth() {
  console.log('\n🧪 Google Auth Manual Test\n');
  console.log('━'.repeat(50));
  console.log(`📍 Testing: ${APP_URL}`);
  console.log('━'.repeat(50));

  const browser = await chromium.launch({
    headless: false, // Show the browser
    slowMo: 100, // Slow down for visibility
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  console.log('\n📋 Test Steps:');
  console.log('1. Navigate to app');
  console.log('2. Look for Google Sign-In button');
  console.log('3. Click it and sign in with a test user');
  console.log('4. Verify you reach the authenticated state\n');

  try {
    // Step 1: Go to the app
    console.log('⏳ Loading app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    console.log('✅ App loaded\n');

    // Step 2: Check if Google button exists
    console.log('🔍 Looking for Google Sign-In button...');

    // Wait a bit for the welcome screen to render
    await page.waitForTimeout(2000);

    // Take a screenshot of initial state
    await page.screenshot({ path: '/tmp/auth-test-1-initial.png' });
    console.log('📸 Screenshot saved: /tmp/auth-test-1-initial.png');

    // Check for Google button (iframe from Google One Tap)
    const googleButton = await page.locator('div[id^="g_id_"]').or(page.locator('iframe[src*="accounts.google.com"]')).first();
    const hasGoogleButton = await googleButton.count() > 0;

    if (hasGoogleButton) {
      console.log('✅ Google Sign-In button found!\n');
    } else {
      // Try looking for the container where Google button should be
      const buttonContainer = await page.locator('text=Iniciar sesión con Google').or(page.locator('[aria-label*="Google"]'));
      if (await buttonContainer.count() > 0) {
        console.log('✅ Google Sign-In element found!\n');
      } else {
        console.log('⚠️  Google Sign-In button not found - checking page content...\n');

        // Log what's on the page
        const pageText = await page.textContent('body');
        if (pageText.includes('PIN') || pageText.includes('Acceso')) {
          console.log('📝 Welcome screen detected with access options');
        }
      }
    }

    console.log('━'.repeat(50));
    console.log('🎮 MANUAL INTERACTION TIME');
    console.log('━'.repeat(50));
    console.log('\nThe browser is now open. Please:');
    console.log('1. Click the Google Sign-In button');
    console.log('2. Sign in with one of your test users:');
    console.log('   - casamanglecali@gmail.com');
    console.log('   - isalavikinga@gmail.com');
    console.log('   - kpp.coomunity@gmail.com');
    console.log('   - (or any other test user you added)');
    console.log('\n3. After signing in, check if:');
    console.log('   - You see your profile/name');
    console.log('   - You have access to the app');
    console.log('   - No errors appear\n');
    console.log('Press Ctrl+C when done testing.\n');

    // Keep browser open for manual testing
    // Listen for console messages from the page
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console Error:', msg.text());
      } else if (msg.text().includes('Auth') || msg.text().includes('Google')) {
        console.log('📝 Auth Log:', msg.text());
      }
    });

    // Listen for auth-related network requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('validate-user') || url.includes('user-prefs')) {
        console.log(`📡 API Call: ${response.status()} ${url.split('?')[0]}`);
      }
    });

    // Wait indefinitely (user closes browser or Ctrl+C)
    await new Promise(() => {});

  } catch (error) {
    if (error.message.includes('Target closed') || error.message.includes('Browser closed')) {
      console.log('\n✅ Browser closed. Test session ended.');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  } finally {
    await browser.close();
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Test session ended by user.');
  process.exit(0);
});

testGoogleAuth();
