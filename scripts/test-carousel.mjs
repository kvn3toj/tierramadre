import puppeteer from 'puppeteer';

// Test against localhost to verify fix
const PROD_URL = 'http://localhost:3000';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testCarousels() {
  console.log('🚀 Puppeteer Test - Carousel & WhatsApp Button\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true });

  // Load and login as guest
  await page.goto(PROD_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(1500);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent?.includes('Invitado'));
    btn?.click();
  });
  await delay(2000);

  console.log('==================================================');
  console.log('📱 CAROUSEL LAYOUT TESTS');
  console.log('==================================================');

  // Portrait test
  console.log('\n1️⃣ Portrait (390x844):');
  const portrait = await page.evaluate(() => {
    const section = document.querySelector('[aria-label="Galería de esmeraldas"]');
    const container = section?.querySelector(':scope > div > div');
    return container ? window.getComputedStyle(container).flexDirection : 'not found';
  });
  console.log('   flexDirection:', portrait);
  console.log('   Result:', portrait === 'column' ? '✅ PASS' : '❌ FAIL');

  // Landscape test
  await page.setViewport({ width: 844, height: 390, isMobile: true });
  await delay(500);

  console.log('\n2️⃣ Landscape (844x390):');
  const landscape = await page.evaluate(() => {
    const section = document.querySelector('[aria-label="Galería de esmeraldas"]');
    const container = section?.querySelector(':scope > div > div');
    return container ? window.getComputedStyle(container).flexDirection : 'not found';
  });
  console.log('   flexDirection:', landscape);
  console.log('   Result:', landscape === 'row' ? '✅ PASS' : '❌ FAIL');

  // Screenshot in landscape
  await page.screenshot({ path: '/tmp/carousel-landscape.png', fullPage: false });
  console.log('\n📸 Landscape screenshot: /tmp/carousel-landscape.png');

  console.log('\n==================================================');
  console.log('💬 WHATSAPP BUTTON TEST');
  console.log('==================================================');

  // Back to portrait for WhatsApp test
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await delay(500);

  // Find ALL WhatsApp links and check which one is fixed
  const waTest = await page.evaluate(() => {
    const allWaLinks = Array.from(document.querySelectorAll('a[href*="wa.me"]'));

    const results = allWaLinks.map((link, i) => {
      // Check if this link or any ancestor has position: fixed
      let el = link;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed') {
          const rect = el.getBoundingClientRect();
          return {
            index: i,
            isFixed: true,
            bottomCSS: style.bottom,
            distanceFromBottom: window.innerHeight - rect.bottom,
            viewportHeight: window.innerHeight
          };
        }
        el = el.parentElement;
      }
      return { index: i, isFixed: false };
    });

    return {
      totalLinks: allWaLinks.length,
      results
    };
  });

  console.log('\n   Total WhatsApp links found:', waTest.totalLinks);

  const fixedButton = waTest.results.find(r => r.isFixed);

  if (fixedButton) {
    console.log('\n   ✅ Fixed WhatsApp button found!');
    console.log('   Bottom CSS:', fixedButton.bottomCSS);
    console.log('   Distance from viewport bottom:', Math.round(fixedButton.distanceFromBottom), 'px');
    console.log('   Viewport height:', fixedButton.viewportHeight, 'px');

    const isAboveNav = fixedButton.distanceFromBottom > 50;
    console.log('\n   Result:', isAboveNav ? '✅ PASS - Above nav bar' : '❌ FAIL - May be blocked');
  } else {
    console.log('\n   ❌ No fixed WhatsApp button found!');
    console.log('   All buttons have static/relative position');
    waTest.results.forEach((r, i) => {
      console.log(`   Link ${i}: isFixed=${r.isFixed}`);
    });
  }

  // Take final screenshot showing button position
  await page.screenshot({ path: '/tmp/whatsapp-position.png', fullPage: false });
  console.log('\n📸 WhatsApp screenshot: /tmp/whatsapp-position.png');

  await browser.close();

  console.log('\n==================================================');
  console.log('🏁 TEST SUMMARY');
  console.log('==================================================');
  console.log('Carousel Portrait:', portrait === 'column' ? '✅ PASS' : '❌ FAIL');
  console.log('Carousel Landscape:', landscape === 'row' ? '✅ PASS' : '❌ FAIL');
  console.log('WhatsApp Button:', fixedButton && fixedButton.distanceFromBottom > 50 ? '✅ PASS' : '⚠️ CHECK');
  console.log('==================================================');
}

testCarousels().catch(console.error);
