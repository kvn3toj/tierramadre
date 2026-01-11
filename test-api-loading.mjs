import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Capture console logs and network requests
const logs = [];
const apiCalls = [];
const allRequests = [];

page.on('console', msg => {
  logs.push('[' + msg.type() + '] ' + msg.text());
});

page.on('request', request => {
  const url = request.url();
  if (url.includes('/api/') || url.includes('googleapis') || url.includes('drive.google')) {
    allRequests.push({ url: url, method: request.method() });
  }
});

page.on('response', response => {
  const url = response.url();
  if (url.includes('/api/') || url.includes('googleapis') || url.includes('drive.google')) {
    apiCalls.push({
      url: url,
      status: response.status(),
      ok: response.ok()
    });
  }
});

console.log('Navigating to http://localhost:3000...\n');
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 60000 });

// Look for and click "Modo Invitado" (Guest Mode) to bypass login
console.log('Looking for Guest Mode button...');

// Try to find all buttons and look for the guest one
const clicked = await page.evaluate(() => {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.innerText.toLowerCase();
    if (text.includes('invitado') || text.includes('guest')) {
      btn.click();
      return true;
    }
  }
  return false;
});

if (clicked) {
  console.log('Clicked Guest Mode button!\n');
} else {
  console.log('Could not find Guest Mode button\n');
}

// Wait for navigation and data to load
console.log('Waiting for data to load after login...\n');
await new Promise(r => setTimeout(r, 8000));

// Check page content
const pageContent = await page.evaluate(() => {
  return {
    bodyText: document.body.innerText.substring(0, 1200),
    hasLogin: document.body.innerText.includes('Acceder con Google'),
    url: window.location.href
  };
});

console.log('=== PAGE STATE ===');
console.log('URL: ' + pageContent.url);
console.log('Still on login page: ' + pageContent.hasLogin);
console.log('Page content preview:\n' + pageContent.bodyText.substring(0, 500) + '...\n');

// Check for API requests made
console.log('=== ALL API/DRIVE REQUESTS ===');
if (allRequests.length === 0) {
  console.log('No API/Drive requests made!');
} else {
  allRequests.forEach(req => {
    console.log(req.method + ' ' + req.url.substring(0, 120));
  });
}

// Check for API responses
console.log('\n=== API RESPONSES ===');
if (apiCalls.length === 0) {
  console.log('No API responses received!');
} else {
  apiCalls.forEach(call => {
    const status = call.ok ? 'OK' : 'FAIL';
    console.log(status + ' ' + call.status + ' - ' + call.url.substring(0, 120));
  });
}

// Check for images from Google Drive
const images = await page.evaluate(() => {
  const imgs = document.querySelectorAll('img');
  return Array.from(imgs).map(img => ({
    src: img.src,
    loaded: img.complete && img.naturalWidth > 0,
    alt: img.alt || '(no alt)'
  }));
});

console.log('\n=== IMAGES ===');
if (images.length === 0) {
  console.log('No images found on page');
} else {
  images.slice(0, 10).forEach(img => {
    const status = img.loaded ? 'LOADED' : 'NOT_LOADED';
    const srcShort = img.src.length > 80 ? img.src.substring(0, 80) + '...' : img.src;
    console.log(status + ' ' + img.alt + ': ' + srcShort);
  });
  if (images.length > 10) console.log('... and ' + (images.length - 10) + ' more');
}

// Check for product cards with data
const products = await page.evaluate(() => {
  const cards = document.querySelectorAll('[class*="card"], [class*="Card"], [class*="product"], [class*="Product"], [class*="MuiCard"]');
  const prices = document.body.innerText.match(/\$[\d.,]+[MK]?/g) || [];
  const names = ['Corazón', 'Amor', 'Bombon', 'Diosa', 'Venus', 'Esperanza'];
  const foundNames = names.filter(n => document.body.innerText.includes(n));
  return { cardCount: cards.length, prices: prices.slice(0, 8), foundNames };
});

console.log('\n=== PRODUCT DATA ===');
console.log('Product cards found: ' + products.cardCount);
console.log('Prices found: ' + (products.prices.join(', ') || 'None'));
console.log('Product names found: ' + (products.foundNames.join(', ') || 'None'));

// Check console logs for clues
console.log('\n=== RELEVANT CONSOLE LOGS ===');
const relevantLogs = logs.filter(l =>
  l.includes('api') || l.includes('API') ||
  l.includes('fetch') || l.includes('sheet') ||
  l.includes('drive') || l.includes('auth') ||
  l.includes('Error') || l.includes('error')
);
if (relevantLogs.length === 0) {
  console.log('No relevant logs');
} else {
  relevantLogs.slice(0, 15).forEach(l => console.log(l));
}

await browser.close();
console.log('\nTest complete');
