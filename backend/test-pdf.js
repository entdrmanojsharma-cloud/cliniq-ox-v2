const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  await page.setContent('<h1>Test</h1>');
  const pdf = await page.pdf();
  console.log('PDF type:', typeof pdf, 'IsBuffer:', Buffer.isBuffer(pdf), 'constructor:', pdf.constructor.name);
  await browser.close();
})();
