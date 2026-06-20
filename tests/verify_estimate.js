const puppeteer = require('puppeteer');

(async () => {
  console.log('--- STARTING FRONTEND E2E TEST ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Handle browser console and page errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

  try {
    // 1. Navigate to frontend dev server
    console.log('Navigating to http://localhost:9010...');
    await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Perform two-step Login
    console.log('Checking for login screen...');
    const isLogin = await page.$('input[placeholder="Enter User ID"]');
    if (isLogin) {
      console.log('Logging in as "udit"...');
      await page.type('input[placeholder="Enter User ID"]', 'udit');
      
      // Click Next
      console.log('Clicking "Next"...');
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const next = elements.find(el => el.textContent.trim() === 'Next');
        if (next) {
          next.click();
        } else {
          throw new Error('Next button not found in page');
        }
      });

      // Wait for password input to render
      console.log('Waiting for password input...');
      await page.waitForSelector('input[placeholder="••••••••"]');
      await page.type('input[placeholder="••••••••"]', '11111111');

      // Click Sign In
      console.log('Clicking "Sign In"...');
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const signIn = elements.find(el => el.textContent.trim() === 'Sign In');
        if (signIn) {
          signIn.click();
        } else {
          throw new Error('Sign In button not found in page');
        }
      });
      console.log('Login submitted.');
    } else {
      console.log('Already logged in or login inputs not found.');
    }

    // Wait for Dashboard/App to load
    console.log('Waiting for dashboard...');
    await new Promise(r => setTimeout(r, 4000));

    // Take screenshot of dashboard to verify state
    await page.screenshot({ path: 'verify_dashboard.png' });
    console.log('Dashboard screenshot captured.');

    // 3. Programmatically navigate to CalendarEventForm with redirect to EstimateForm
    console.log('Navigating to CalendarEventForm...');
    await page.evaluate(() => {
      if (window.navigationRef && window.navigationRef.current) {
        window.navigationRef.current.navigate('CalendarEventForm', { id: null, redirectToEstimate: true });
      } else {
        throw new Error('window.navigationRef is not defined');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // 4. Click 'Surgery' event category
    console.log('Selecting Surgery event category...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const surg = elements.find(el => el.textContent.trim() === 'Surgery');
      if (surg) {
        surg.click();
      } else {
        throw new Error('Surgery category tile not found');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // 5. Fill Patient search, select Patient
    console.log('Searching patient...');
    await page.waitForSelector('input[placeholder="Type name, UHID or mobile to search..."]');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Type name, UHID or mobile to search..."]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, 'abs test');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        throw new Error('Patient search input not found in evaluate');
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    // Click patient suggestion
    console.log('Selecting Patient suggestion...');
    await page.evaluate(() => {
      const simulateClick = (element) => {
        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const eventOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
          screenX: clientX,
          screenY: clientY,
          buttons: 1
        };
        if (window.PointerEvent) {
          element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
          element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
        }
        element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        element.dispatchEvent(new MouseEvent('click', eventOpts));
      };

      const elements = Array.from(document.querySelectorAll('*'));
      const matches = elements.filter(el => el.textContent.includes('CLKOX-TEST-001') && el.offsetParent !== null);
      if (matches.length > 0) {
        matches.sort((a, b) => {
          if (a.contains(b)) return 1;
          if (b.contains(a)) return -1;
          return a.textContent.length - b.textContent.length;
        });
        let current = matches[0];
        let found = null;
        while (current && current !== document.body) {
          const style = window.getComputedStyle(current);
          if (current.getAttribute('role') === 'button' || current.tagName === 'BUTTON' || style.cursor === 'pointer' || (current.className && typeof current.className === 'string' && current.className.includes('r-cursor-'))) {
            found = current;
            break;
          }
          current = current.parentElement;
        }
        if (!found) found = matches[0];
        console.log('Clicking patient suggestion:', found.textContent);
        simulateClick(found);
      } else {
        throw new Error('Patient suggestion abs test / CLKOX-TEST-001 not found');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // 6. Fill Doctor search, select Doctor
    console.log('Searching doctor...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const textEl = elements.find(el => el.textContent === 'Tap to browse surgeons ▼' && el.offsetParent !== null);
      if (textEl) {
        let current = textEl;
        let count = 0;
        while (current && current !== document.body && count < 4) {
          current.click();
          current = current.parentElement;
          count++;
        }
      } else {
        throw new Error('Doctor dropdown trigger not found');
      }
    });
    const doctorInput = await page.waitForSelector('input[placeholder="Search..."]');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Search..."]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, 'Manoj');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        throw new Error('Doctor search input not found');
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Click doctor suggestion
    console.log('Selecting Doctor suggestion...');
    await page.evaluate(() => {
      const simulateClick = (element) => {
        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const eventOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX,
          clientY,
          screenX: clientX,
          screenY: clientY,
          buttons: 1
        };
        if (window.PointerEvent) {
          element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
          element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
        }
        element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        element.dispatchEvent(new MouseEvent('click', eventOpts));
      };

      const elements = Array.from(document.querySelectorAll('*'));
      const matches = elements.filter(el => el.textContent.includes('Manoj Kumar') && el.textContent.includes('Dr.') && el.offsetParent !== null);
      if (matches.length > 0) {
        matches.sort((a, b) => {
          if (a.contains(b)) return 1;
          if (b.contains(a)) return -1;
          return a.textContent.length - b.textContent.length;
        });
        let current = matches[0];
        let found = null;
        while (current && current !== document.body) {
          const style = window.getComputedStyle(current);
          if (current.getAttribute('role') === 'button' || current.tagName === 'BUTTON' || style.cursor === 'pointer' || (current.className && typeof current.className === 'string' && current.className.includes('r-cursor-'))) {
            found = current;
            break;
          }
          current = current.parentElement;
        }
        if (!found) found = matches[0];
        console.log('Clicking doctor suggestion:', found.textContent);
        simulateClick(found);
      } else {
        throw new Error('Doctor suggestion Manoj Kumar not found');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // 8. Select hour and minute in TimeDropdown and month in DateDropdown
    console.log('Selecting event start date/time dropdowns...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      if (selects.length >= 5) {
        // selects[0] is Day
        const randomDay = String(Math.floor(Math.random() * 18) + 10).padStart(2, '0'); // Random day between 10 and 27
        selects[0].value = randomDay;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));

        // selects[1] is Month (let's set to '06' / June)
        selects[1].value = '06';
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));

        // selects[2] is Year (pre-filled)

        // selects[3] is Hour (random hour between 8 and 11)
        const randomHour = String(Math.floor(Math.random() * 4) + 8);
        selects[3].value = randomHour;
        selects[3].dispatchEvent(new Event('change', { bubbles: true }));

        // selects[4] is Min
        const randomMin = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
        selects[4].value = randomMin;
        selects[4].dispatchEvent(new Event('change', { bubbles: true }));

        // selects[5] is AM/PM
        if (selects[5]) {
          selects[5].value = 'AM';
          selects[5].dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        throw new Error(`Expected at least 6 select elements on page, found ${selects.length}`);
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // 9. Click Confirm Schedule
    console.log('Submitting schedule...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const confirm = elements.find(el => el.textContent.trim() === 'Confirm Schedule');
      if (confirm) {
        confirm.click();
      } else {
        throw new Error('Confirm Schedule button not found');
      }
    });

    // Wait for redirect to EstimateFormScreen
    console.log('Waiting for EstimateFormScreen redirection...');
    await new Promise(r => setTimeout(r, 5000));

    // 10. Check if we are on EstimateFormScreen by looking for its headers
    const estimateHeader = await page.evaluate(() => {
      const txt = document.body.textContent;
      return txt.includes('EstimateForm') &&
             txt.includes('Save Estimate');
    });

    if (estimateHeader) {
      console.log('EstimateFormScreen loaded successfully.');
    } else {
      await page.screenshot({ path: 'verify_estimatescreen_fail.png' });
      throw new Error('Failed to load EstimateFormScreen after scheduling redirect');
    }

    console.log('Adding surgery "Appendectomy" in Estimate Form...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const trigger = elements.find(el => (el.textContent.trim() === '+ Add Surgery Procedure' || el.textContent.trim() === '+ Add Surgery') && el.offsetParent !== null);
      if (trigger) {
        trigger.click();
      } else {
        throw new Error('"+ Add Surgery Procedure" or "+ Add Surgery" trigger not found');
      }
    });
    await page.waitForSelector('input[placeholder="Type to search..."]');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Type to search..."]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, 'Appendectomy');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        throw new Error('Surgery search input not found');
      }
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const simulateClick = (element) => {
        const rect = element.getBoundingClientRect();
        const clientX = rect.left + rect.width / 2;
        const clientY = rect.top + rect.height / 2;
        const eventOpts = { bubbles: true, cancelable: true, view: window, clientX, clientY, screenX: clientX, screenY: clientY, buttons: 1 };
        if (window.PointerEvent) {
          element.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
          element.dispatchEvent(new PointerEvent('pointerup', eventOpts));
        }
        element.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        element.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        element.dispatchEvent(new MouseEvent('click', eventOpts));
      };

      const elements = Array.from(document.querySelectorAll('*'));
      const matches = elements.filter(el => el.textContent.includes('Appendectomy') && el.textContent.includes('₹') && el.offsetParent !== null);
      if (matches.length > 0) {
        matches.sort((a, b) => {
          if (a.contains(b)) return 1;
          if (b.contains(a)) return -1;
          return a.textContent.length - b.textContent.length;
        });
        let current = matches[0];
        let found = null;
        while (current && current !== document.body) {
          const style = window.getComputedStyle(current);
          if (current.getAttribute('role') === 'button' || current.tagName === 'BUTTON' || style.cursor === 'pointer' || (current.className && typeof current.className === 'string' && current.className.includes('r-cursor-'))) {
            found = current;
            break;
          }
          current = current.parentElement;
        }
        if (!found) found = matches[0];
        simulateClick(found);
      } else {
        throw new Error('Appendectomy suggestion not found');
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    // 11. Click "Save Estimate" in the sticky bottom total bar
    console.log('Clicking Save Estimate...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const matches = elements.filter(el => el.textContent.includes('Save Estimate'));
      if (matches.length > 0) {
        matches.sort((a, b) => a.textContent.length - b.textContent.length);
        matches[0].click();
      } else {
        throw new Error('Save Estimate button not found');
      }
    });

    // Wait for alert modal to appear
    await new Promise(r => setTimeout(r, 3000));

    // Check if the AlertModal displays Success
    const successAlertVisible = await page.evaluate(() => {
      const txt = document.body.textContent;
      return txt.includes('Success') &&
             (txt.includes('Estimate created successfully') || txt.includes('Estimate updated successfully'));
    });

    if (successAlertVisible) {
      console.log('SUCCESS: E2E Test passed! Estimate created and saved successfully without render crashes.');
    } else {
      // Capture screenshot to see error/state
      await page.screenshot({ path: 'verify_error_state.png' });
      throw new Error('Success alert modal not visible. Save might have failed.');
    }

  } catch (error) {
    console.error('E2E TEST FAILED:', error.message);
    await page.screenshot({ path: 'verify_failure.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('E2E Test complete. Browser closed.');
  }
})();
