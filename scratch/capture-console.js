const puppeteer = require('puppeteer');

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Collect logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type().toUpperCase()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[BROWSER UNCAUGHT ERROR]', err.message, err.stack);
  });

  console.log('Navigating to http://localhost:9010...');
  try {
    await page.goto('http://localhost:9010', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }

  console.log('Waiting 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'frontend-error-screenshot.png' });
  console.log('Screenshot saved to frontend-error-screenshot.png');

  const html = await page.content();
  console.log('Body length:', html.length);

  await browser.close();
}

run().catch(console.error);
