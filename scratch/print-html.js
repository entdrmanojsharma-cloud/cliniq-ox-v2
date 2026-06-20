const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error('[UNCAUGHT ERROR]', err);
  });

  try {
    await page.goto('http://localhost:9010', { waitUntil: 'networkidle2', timeout: 10000 });
  } catch (e) {
    console.log('Navigation warning:', e.message);
  }

  const html = await page.content();
  console.log('--- PAGE HTML ---');
  console.log(html);
  console.log('-----------------');

  await browser.close();
}

run().catch(console.error);
