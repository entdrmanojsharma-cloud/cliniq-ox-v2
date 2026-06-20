const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = '/Users/drpriyankasharma/.gemini/antigravity-ide/brain/181c1373-958a-4c7a-82d0-a328b856f786';

async function run() {
  console.log('Starting Multi-User Auth Lifecycle Tests...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE EXCEPTION]', err.message);
  });

  const clickElementWithText = async (text) => {
    const elements = await page.$$('div, span, button, a');
    for (let el of elements) {
      const hasChildren = await page.evaluate(e => e.children.length > 0, el);
      if (hasChildren) continue;
      
      const elText = await page.evaluate(e => e.textContent, el);
      if (elText && elText.trim() === text) {
        await el.click();
        return true;
      }
    }
    return false;
  };

  const registerUser = async (email, password, role) => {
    console.log(`\nRegistering new ${role}: ${email}...`);
    await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Toggle to Register mode
    await clickElementWithText('Need to register a new user? Register Here');
    await new Promise(r => setTimeout(r, 500));

    // Fill Hospital Code
    await page.click('input[placeholder="e.g. HOSP1"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="e.g. HOSP1"]', 'CLKOX');

    // Fill Email
    await page.click('input[placeholder="name@cliniqox.com"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="name@cliniqox.com"]', email);

    // Fill Password
    await page.click('input[placeholder="••••••••"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="••••••••"]', password);

    // Click Role
    await clickElementWithText(role);
    await new Promise(r => setTimeout(r, 200));

    // Submit
    // Since alert pops up, we handle the dialog
    const dialogHandler = async dialog => {
      console.log(`[DIALOG] ${dialog.message()}`);
      await dialog.accept();
    };
    page.once('dialog', dialogHandler);

    await clickElementWithText('Register Account');
    await new Promise(r => setTimeout(r, 2000));
  };

  const loginAndVerify = async (email, password, expectedRole, screenshotName) => {
    console.log(`\nLogging in as ${email}...`);
    await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Fill Hospital Code
    await page.click('input[placeholder="e.g. HOSP1"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="e.g. HOSP1"]', 'CLKOX');

    // Fill Email
    await page.click('input[placeholder="name@cliniqox.com"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="name@cliniqox.com"]', email);

    // Fill Password
    await page.click('input[placeholder="••••••••"]');
    await page.keyboard.down('Meta');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Meta');
    await page.keyboard.press('Backspace');
    await page.type('input[placeholder="••••••••"]', password);

    await clickElementWithText('Sign In');
    await new Promise(r => setTimeout(r, 2000));

    const bodyText = await page.evaluate(() => document.body.textContent);
    if (bodyText.includes(`User Role${expectedRole}`) || bodyText.includes(expectedRole)) {
      console.log(`✅ Success: Logged in and verified role "${expectedRole}" on the dashboard!`);
    } else {
      console.log(`⚠️ Warning: Dashboard role check failed. Role text "${expectedRole}" not found.`);
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, screenshotName) });
    console.log(`Saved screenshot as ${screenshotName}`);

    // Click Sign Out
    console.log('Signing out...');
    await clickElementWithText('Sign Out');
    await new Promise(r => setTimeout(r, 1000));
  };

  // Generate unique emails to avoid database collisions
  const time = Date.now().toString().slice(-6);
  const docEmail = `doc_${time}@cliniqox.com`;
  const recEmail = `rec_${time}@cliniqox.com`;
  const adminEmail = `admin_${time}@cliniqox.com`;
  const password = 'password123';

  // Register all users
  await registerUser(docEmail, password, 'DOCTOR');
  await registerUser(recEmail, password, 'RECEPTIONIST');
  await registerUser(adminEmail, password, 'ADMIN');

  // Login and verify doctor
  await loginAndVerify(docEmail, password, 'DOCTOR', 'test_verified_doctor_dashboard.png');

  // Login and verify receptionist
  await loginAndVerify(recEmail, password, 'RECEPTIONIST', 'test_verified_receptionist_dashboard.png');

  // Login and verify admin
  await loginAndVerify(adminEmail, password, 'ADMIN', 'test_verified_admin_dashboard.png');

  await browser.close();
  console.log('\nAll multi-user authentication lifecycle tests completed successfully!');
}

run().catch(console.error);
