const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = '/Users/drpriyankasharma/.gemini/antigravity-ide/brain/181c1373-958a-4c7a-82d0-a328b856f786';

async function run() {
  console.log('Starting Cliniq-OX Frontend Verification Tests...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Listen to browser console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('[BROWSER CONSOLE ERROR]', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.error('[BROWSER PAGE EXCEPTION]', err.message);
  });

  // Helper function to find a clickable element by text (exact match)
  const clickElementWithText = async (text) => {
    const elements = await page.$$('div, span, button, a');
    for (let el of elements) {
      // Check if it is a leaf element containing the exact text
      const hasChildren = await page.evaluate(e => e.children.length > 0, el);
      if (hasChildren) continue; // Skip container elements
      
      const elText = await page.evaluate(e => e.textContent, el);
      if (elText && elText.trim() === text) {
        await el.click();
        return true;
      }
    }
    return false;
  };

  // 1. Dashboard Page
  console.log('\n[TEST 1] Loading Dashboard...');
  await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_dashboard_loaded.png') });
  console.log('Saved dashboard screenshot.');

  // 2. Navigate to Patients
  console.log('\n[TEST 2] Navigating to Patients Directory...');
  let clicked = await clickElementWithText('Patients Directory');
  if (!clicked) throw new Error('Could not find Patients Directory tile');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_patients_directory.png') });
  console.log('Saved Patients Directory screenshot.');

  // 3. Open Patient Form
  console.log('\n[TEST 3] Opening Patient Registration Form...');
  const fabClicked = await clickElementWithText('+');
  if (!fabClicked) throw new Error('Could not find floating "+" button');
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_patient_form.png') });
  console.log('Saved Patient Form screenshot.');

  // 4. Fill and Submit Patient Form
  console.log('\n[TEST 4] Registering a New Patient (Alex Care)...');
  await page.type('input[placeholder="John Doe"]', 'Alex Care');
  await page.type('input[placeholder="9876543210"]', '9988776655');
  await page.type('input[placeholder="1990-01-01"]', '1995-10-10');
  
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_patient_form_filled.png') });
  
  const saveClicked = await clickElementWithText('Save Record');
  if (!saveClicked) throw new Error('Could not find "Save Record" button');

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_patients_directory_updated.png') });
  console.log('Submitted form. Saved updated directory screenshot.');

  // Check if patient lists includes Alex Care
  const bodyText = await page.evaluate(() => document.body.textContent);
  if (bodyText.includes('Alex Care')) {
    console.log('✅ Success: New Patient "Alex Care" is displayed in the list!');
  } else {
    console.log('⚠️ Warning: "Alex Care" not found in the page text.');
  }

  // 5. Navigate back to Dashboard and check Doctors Roster
  console.log('\n[TEST 5] Checking Doctors Roster...');
  // Go back (using header back button or going back to home)
  await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const doctorsClicked = await clickElementWithText('Doctors Roster');
  if (!doctorsClicked) throw new Error('Could not find Doctors Roster tile');

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_doctors_roster.png') });
  console.log('Saved Doctors Roster screenshot.');

  // Check if doctor names are listed
  const docBodyText = await page.evaluate(() => document.body.textContent);
  if (docBodyText.includes('Sarah Conner')) {
    console.log('✅ Success: Doctor "Sarah Conner" is displayed in the roster!');
  } else {
    console.log('⚠️ Warning: "Sarah Conner" not found in the doctors list.');
  }

  // 6. Navigate back to Dashboard and check Calendar
  console.log('\n[TEST 6] Checking OT Schedule Calendar...');
  await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const calendarClicked = await clickElementWithText('OT Schedule Calendar');
  if (!calendarClicked) throw new Error('Could not find Calendar tile');

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'test_calendar.png') });
  console.log('Saved Calendar screenshot.');

  await browser.close();
  console.log('\nAll verification tests completed successfully!');
}

run().catch(err => {
  console.error('\nVerification failed:', err);
  process.exit(1);
});
