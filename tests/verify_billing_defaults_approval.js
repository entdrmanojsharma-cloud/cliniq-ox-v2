const puppeteer = require('puppeteer');

(async () => {
  console.log('--- STARTING BILLING DEFAULTS & ESTIMATE APPROVAL E2E TEST ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  // Handle browser console and page errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.toString()));

  try {
    const simulateClick = async (element) => {
      await page.evaluate((el) => {
        const rect = el.getBoundingClientRect();
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
          el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
          el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
        }
        el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
        el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
        el.dispatchEvent(new MouseEvent('click', eventOpts));
      }, element);
    };

    // Helper to log in
    const login = async (username, password) => {
      console.log(`Navigating to login page for ${username}...`);
      await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 3000));

      const isLogin = await page.$('input[placeholder="Enter User ID"]');
      if (isLogin) {
        console.log(`Logging in as "${username}"...`);
        await page.evaluate((u) => {
          const input = document.querySelector('input[placeholder="Enter User ID"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, u);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            throw new Error('Username input element not found');
          }
        }, username);
        await new Promise(r => setTimeout(r, 500));
        
        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const next = elements.find(el => el.textContent.trim() === 'Next');
          if (next) next.click();
          else throw new Error('Next button not found in page');
        });

        await page.waitForSelector('input[placeholder="••••••••"]');
        await new Promise(r => setTimeout(r, 500));

        await page.evaluate((p) => {
          const input = document.querySelector('input[placeholder="••••••••"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, p);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            throw new Error('Password input element not found');
          }
        }, password);
        await new Promise(r => setTimeout(r, 500));

        await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          const signIn = elements.find(el => el.textContent.trim() === 'Sign In');
          if (signIn) signIn.click();
          else throw new Error('Sign In button not found in page');
        });

        console.log('Login submitted.');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log('Already logged in or login inputs not found.');
      }
    };

    // Helper to clear session / logout
    const logout = async () => {
      console.log('Logging out / clearing local storage...');
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto('http://localhost:9010', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
    };

    // --- STEP 1: Log in as ADMIN (udit) & Set Billing Defaults ---
    await login('udit', '11111111');

    console.log('Navigating to BillingDefaults configuration screen...');
    await page.evaluate(() => {
      if (window.navigationRef && window.navigationRef.current) {
        window.navigationRef.current.navigate('BillingDefaults');
      } else {
        throw new Error('window.navigationRef is not defined');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Capture initial billing defaults screen
    await page.screenshot({ path: 'verify_billing_defaults_screen_initial.png' });
    console.log('Billing Defaults screen screenshot captured.');

    // Set billing defaults values
    console.log('Setting default billing rates...');
    const setInputValue = async (label, value) => {
      await page.evaluate((lbl, val) => {
        const elements = Array.from(document.querySelectorAll('*'));
        const labelEl = elements.find(el => el.textContent.trim() === lbl && el.offsetParent !== null);
        if (!labelEl) throw new Error(`Label not found: ${lbl}`);
        
        const inputs = Array.from(document.querySelectorAll('input'));
        const input = inputs.find(inp => {
          return labelEl.compareDocumentPosition(inp) & Node.DOCUMENT_POSITION_FOLLOWING;
        });
        
        if (!input) throw new Error(`Input not found after label: ${lbl}`);
        
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, label, value);
      await new Promise(r => setTimeout(r, 100));
    };

    await setInputValue('Room Charge (Daily)', '2500');
    await setInputValue('ICU Charge (Daily)', '5000');
    await setInputValue('Ward Charge (Daily)', '1500');
    await setInputValue('Nursing Charge (Daily)', '600');
    await setInputValue('OT Charges', '8000');
    await setInputValue('General Anaesthesia (GA)', '2000');
    await setInputValue('Local Anaesthesia (LA)', '500');
    await setInputValue('Sedation', '1000');
    await setInputValue('Lead Surgeon Fee', '15000');
    await setInputValue('Assistant Surgeon Fee', '4000');
    await setInputValue('Patient Monitoring', '800');
    await setInputValue('Clinical Dressing', '200');
    await setInputValue('Medical Consumables', '600');
    await setInputValue('Surgical Equipment', '1500');
    await setInputValue('Admission Fee', '300');
    await setInputValue('Registration Fee', '200');

    console.log('Clicking Save Default Rates...');
    const saveBtnHandle = await page.evaluateHandle(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const btn = elements.find(el => el.textContent.trim() === 'Save Default Rates');
      if (btn) {
        btn.scrollIntoView();
        return btn;
      }
      return null;
    });

    if (saveBtnHandle && saveBtnHandle.asElement()) {
      await simulateClick(saveBtnHandle.asElement());
    } else {
      throw new Error('Save Default Rates button not found');
    }
    console.log('Waiting for billing defaults save confirmation...');
    let saveAlertText = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      saveAlertText = await page.evaluate(() => {
        const txt = document.body.textContent;
        return txt.includes('Success') && txt.includes('saved successfully');
      });
      if (saveAlertText) break;
    }

    if (saveAlertText) {
      console.log('SUCCESS: Billing default rates saved successfully.');
      // Dismiss Alert
      await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const okBtn = elements.find(el => el.textContent.trim() === 'OK' && el.offsetParent !== null);
        if (okBtn) okBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    } else {
      await page.screenshot({ path: 'verify_billing_defaults_save_fail.png' });
      throw new Error('Save billing defaults confirmation not seen');
    }

    // --- STEP 2: Verify Persistence on Refresh ---
    console.log('Refreshing page to verify billing defaults persistence...');
    await page.evaluate(() => {
      if (window.navigationRef && window.navigationRef.current) {
        window.navigationRef.current.navigate('Dashboard');
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      if (window.navigationRef && window.navigationRef.current) {
        window.navigationRef.current.navigate('BillingDefaults');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    const verifyPersistence = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const label = elements.find(el => el.textContent.trim() === 'Room Charge (Daily)' && el.offsetParent !== null);
      if (!label) return false;
      const input = label.parentElement.querySelector('input');
      return input && input.value === '2500';
    });

    if (verifyPersistence) {
      console.log('SUCCESS: Billing defaults persistence verified.');
    } else {
      await page.screenshot({ path: 'verify_persistence_fail.png' });
      throw new Error('Persistence check failed. Room Charge (Daily) was not 2500.');
    }

    // --- STEP 3: Auto-Fetch surgery/event parameters and Auto-Fill Billing Defaults ---
    console.log('Navigating to CalendarEventForm...');
    await page.evaluate(() => {
      if (window.navigationRef && window.navigationRef.current) {
        window.navigationRef.current.navigate('CalendarEventForm', { id: null, redirectToEstimate: true });
      } else {
        throw new Error('window.navigationRef is not defined');
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Selecting Surgery event category...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const surg = elements.find(el => el.textContent.trim() === 'Surgery');
      if (surg) surg.click();
      else throw new Error('Surgery category tile not found');
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Searching patient "abs test"...');
    await page.waitForSelector('input[placeholder="Type name, UHID or mobile to search..."]');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Type name, UHID or mobile to search..."]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, 'abs test');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1500));

    console.log('Selecting Patient suggestion...');
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
        simulateClick(found);
      } else {
        throw new Error('Patient suggestion abs test / CLKOX-TEST-001 not found');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Searching doctor "Manoj"...');
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
    await page.waitForSelector('input[placeholder="Search..."]');
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder="Search..."]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, 'Manoj');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Selecting Doctor Dr. Manoj Kumar...');
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
        simulateClick(found);
      } else {
        throw new Error('Doctor suggestion Manoj Kumar not found');
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Selecting event start date/time select dropdowns...');
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      if (selects.length >= 5) {
        // selects[0] is Day
        const randomDay = String(Math.floor(Math.random() * 18) + 10).padStart(2, '0'); // Random day between 10 and 27
        selects[0].value = randomDay;
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));

        // selects[1] is Month (random month between July (07) and November (11))
        const randomMonth = String(Math.floor(Math.random() * 5) + 7).padStart(2, '0');
        selects[1].value = randomMonth;
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));

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

    console.log('Submitting schedule...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const confirm = elements.find(el => el.textContent.trim() === 'Confirm Schedule');
      if (confirm) confirm.click();
      else throw new Error('Confirm Schedule button not found');
    });

    console.log('Waiting for EstimateFormScreen redirection...');
    await new Promise(r => setTimeout(r, 5000));

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

    // Verify EstimateFormScreen loaded and pre-filled fields
    const checkFormPreFill = await page.evaluate(() => {
      const txt = document.body.textContent;
      const hasLinkedEventBanner = txt.includes('Linked Event');
      const hasManoj = txt.includes('Dr. Manoj Kumar');
      const hasAppendectomy = txt.includes('Appendectomy');
      
      const ok = hasLinkedEventBanner && hasManoj && hasAppendectomy;
      
      // Let's verify defaults loaded by searching for rates in input fields
      const inputs = Array.from(document.querySelectorAll('input'));
      
      // We expect Room rate input to have '2500' and Nursing rate to have '600'
      const roomInput = inputs.find(i => i.value === '2500');
      const nursingInput = inputs.find(i => i.value === '600');
      const otInput = inputs.find(i => i.value === '8000');
      
      return {
        ok,
        hasLinkedEventBanner,
        hasManoj,
        hasAppendectomy,
        hasRoomDefault: !!roomInput,
        hasNursingDefault: !!nursingInput,
        hasOtDefault: !!otInput
      };
    });

    console.log('Pre-fill details:', JSON.stringify(checkFormPreFill));
    if (checkFormPreFill.ok && checkFormPreFill.hasRoomDefault && checkFormPreFill.hasNursingDefault) {
      console.log('SUCCESS: Auto-Fetch and Billing Defaults Auto-Fill verified on Estimate Form.');
    } else {
      await page.screenshot({ path: 'verify_estimate_form_prefill_fail.png' });
      throw new Error(`Auto-Fetch or Billing Defaults Auto-Fill failed. Details: ${JSON.stringify(checkFormPreFill)}`);
    }

    // --- STEP 4: Toggle Fixed Package Estimate & Save ---
    console.log('Toggling Fixed Package Estimate...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const textEl = elements.find(el => el.textContent.trim() === 'Fixed Template (Y/N)');
      if (!textEl) throw new Error('Text element "Fixed Template (Y/N)" not found');

      let container = textEl;
      while (container && container !== document.body) {
        const style = window.getComputedStyle(container);
        if (style.flexDirection === 'row' || container.children.length >= 2) {
          const firstChild = container.firstElementChild;
          if (firstChild && firstChild !== textEl) {
            firstChild.click();
            return;
          }
        }
        container = container.parentElement;
      }
      throw new Error('Could not find checkbox container/sibling for Fixed Template (Y/N)');
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Setting Package fields...');
    await page.evaluate(() => {
      const setInputValueByLabel = (labelText, value) => {
        const elements = Array.from(document.querySelectorAll('*'));
        // Find leaf elements to ensure we get the exact Text element
        const label = elements.find(el => el.textContent.trim() === labelText && el.offsetParent !== null && el.children.length === 0);
        if (!label) throw new Error(`Label not found: ${labelText}`);
        
        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        const input = inputs.find(inp => {
          return label.compareDocumentPosition(inp) & Node.DOCUMENT_POSITION_FOLLOWING;
        });
        if (!input) throw new Error(`Input not found after label: ${labelText}`);
        
        const proto = input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
        nativeInputValueSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setInputValueByLabel('Package Name *', 'Appendectomy Fixed Package');
      setInputValueByLabel('Package Amount (₹) *', '45000');
      setInputValueByLabel('Inclusion Note', 'Lead Surgeon charges, 2 days Room stay, OT charges, basic medicines');
    });

    await page.screenshot({ path: 'verify_estimate_package_filled.png' });

    console.log('Saving Estimate...');
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

    console.log('Waiting for save confirmation...');
    let isCreatedSuccess = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      isCreatedSuccess = await page.evaluate(() => {
        const txt = document.body.textContent;
        return txt.includes('Success') && txt.includes('created successfully');
      });
      if (isCreatedSuccess) break;
    }

    if (isCreatedSuccess) {
      console.log('SUCCESS: Estimate package created and saved successfully.');
    } else {
      await page.screenshot({ path: 'verify_estimate_save_fail.png' });
      throw new Error('Failed to save package estimate');
    }

    // Click '🖨️ View & Print' to navigate to Detail page
    console.log('Navigating to EstimateDetail...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const viewBtn = elements.find(el => el.textContent.trim() === '🖨️ View & Print' && el.offsetParent !== null);
      if (viewBtn) viewBtn.click();
      else throw new Error('View & Print button not found');
    });

    console.log('Waiting for EstimateDetail screen to load data...');
    let detailLoaded = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      detailLoaded = await page.evaluate(() => {
        return document.body.textContent.includes('Status:');
      });
      if (detailLoaded) break;
    }

    // Extract Estimate ID for later doctor approval navigation
    const estimateId = await page.evaluate(() => {
      const route = window.navigationRef.current.getCurrentRoute();
      return route ? route.params?.id : null;
    });
    console.log('Extracted Estimate ID:', estimateId);
    if (!estimateId) {
      throw new Error('Failed to extract estimate ID from route params');
    }

    await page.screenshot({ path: 'verify_estimate_detail_screen_admin.png' });

    // Verify detail page elements
    const checkDetailAdmin = await page.evaluate(() => {
      const txt = document.body.textContent;
      const isPackageSummaryShown = txt.includes('Package Name: Appendectomy Fixed Package') &&
                                    txt.includes('Package Price: INR 45,000') &&
                                    txt.includes('Consultant Surgeon: Dr. Manoj Kumar');
      
      // Under admin, status should be DRAFT, and "Submit for Doctor Approval" button should be visible.
      // Confirm that doctor approval buttons (✓ Approve / ✕ Reject) are NOT visible for ADMIN.
      const hasSubmitBtn = txt.includes('Submit for Doctor Approval');
      const hasDoctorApproveBtn = txt.includes('✓ Approve') || txt.includes('✕ Reject');
      
      return {
        isPackageSummaryShown,
        hasSubmitBtn,
        hasDoctorApproveBtn
      };
    });

    console.log('Detail screen (Admin):', JSON.stringify(checkDetailAdmin));
    if (checkDetailAdmin.isPackageSummaryShown && checkDetailAdmin.hasSubmitBtn && !checkDetailAdmin.hasDoctorApproveBtn) {
      console.log('SUCCESS: Admin detail view, consultant surgeon label, and package details verified.');
    } else {
      throw new Error('Admin detail view verification failed.');
    }

    // Submit for Doctor Approval
    console.log('Clicking Submit for Doctor Approval...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const submitBtn = elements.find(el => (el.textContent.trim() === 'Submit for Doctor Approval' || el.textContent.trim() === '📤 Submit for Doctor Approval') && el.offsetParent !== null);
      if (submitBtn) submitBtn.click();
      else throw new Error('Submit button not found');
    });
    await new Promise(r => setTimeout(r, 2000));

    // Dismiss Success Alert
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const okBtn = elements.find(el => el.textContent.trim() === 'OK' && el.offsetParent !== null);
      if (okBtn) okBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const checkPendingStatus = await page.evaluate(() => {
      const txt = document.body.textContent;
      return txt.includes('⏳ Pending Doctor Approval') || txt.includes('PENDING_APPROVAL');
    });

    if (checkPendingStatus) {
      console.log('SUCCESS: Estimate status updated to PENDING_APPROVAL.');
    } else {
      await page.screenshot({ path: 'verify_pending_status_fail.png' });
      throw new Error('Failed to update status to pending approval');
    }

    // --- STEP 5: Log in as Doctor (manoj) & Approve Estimate with Remarks ---
    await logout();
    await login('manoj', 'manoj123');

    // Navigate to EstimatesList first to populate store data, then to EstimateDetail
    console.log('Navigating to EstimatesList screen first to load store data...');
    await page.evaluate(() => {
      window.navigationRef.current.navigate('EstimatesList');
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Navigating directly to estimate detail screen...');
    await page.evaluate((id) => {
      window.navigationRef.current.navigate('EstimateDetail', { id });
    }, estimateId);
    console.log('Waiting for EstimateDetail screen to load data (doctor view)...');
    let doctorDetailLoaded = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      doctorDetailLoaded = await page.evaluate(() => {
        return document.body.textContent.includes('Status:');
      });
      if (doctorDetailLoaded) break;
    }
    await page.screenshot({ path: 'verify_estimate_detail_screen_doctor.png' });

    // Verify doctor view elements
    const checkDetailDoctor = await page.evaluate(() => {
      const txt = document.body.textContent;
      const hasDoctorApproveBtn = txt.includes('✓ Approve') && txt.includes('✕ Reject');
      return { hasDoctorApproveBtn };
    });

    console.log('Detail screen (Doctor):', JSON.stringify(checkDetailDoctor));
    if (checkDetailDoctor.hasDoctorApproveBtn) {
      console.log('SUCCESS: Doctor approval buttons are visible for DOCTOR role.');
    } else {
      throw new Error('Doctor approval buttons not visible for DOCTOR');
    }

    // Click Approve
    console.log('Clicking ✓ Approve...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const approveBtn = elements.find(el => el.textContent.trim() === '✓ Approve' && el.offsetParent !== null);
      if (approveBtn) approveBtn.click();
      else throw new Error('Approve button not found');
    });
    await new Promise(r => setTimeout(r, 1500));

    // Fill Remarks modal
    console.log('Filling approval remarks modal...');
    await page.evaluate(() => {
      const modalInput = document.querySelector('textarea[placeholder="Enter remarks (e.g. Clinical parameters verified...)"]');
      if (modalInput) {
        const proto = modalInput.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(modalInput, 'Clinical parameters verified and approved.');
        modalInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        throw new Error('Remarks input in modal not found');
      }
    });

    console.log('Confirming Approve with Remarks...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const modalConfirmBtn = elements.find(el => (el.textContent.trim() === 'Confirm Approve' || el.textContent.trim() === 'Approve') && el.offsetParent !== null);
      if (modalConfirmBtn) {
        modalConfirmBtn.click();
      } else {
        const fallback = elements.find(el => el.textContent.includes('Confirm Approve') && el.offsetParent !== null);
        if (fallback) fallback.click();
        else throw new Error('Modal Approve button not found');
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Dismiss Success Alert
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const okBtn = elements.find(el => el.textContent.trim() === 'OK' && el.offsetParent !== null);
      if (okBtn) okBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: 'verify_estimate_approved.png' });

    // Verify approved status and doctor remarks display
    const checkApprovedStatusAndRemarks = await page.evaluate(() => {
      const txt = document.body.textContent;
      const isApproved = txt.includes('APPROVED');
      const hasRemarks = txt.includes('Doctor Remarks: Clinical parameters verified and approved.');
      return { isApproved, hasRemarks };
    });

    console.log('Approved status check:', JSON.stringify(checkApprovedStatusAndRemarks));
    if (checkApprovedStatusAndRemarks.isApproved && checkApprovedStatusAndRemarks.hasRemarks) {
      console.log('SUCCESS: Estimate approved and doctor remarks saved/displayed successfully.');
    } else {
      throw new Error('Status approval or doctor remarks display verification failed.');
    }

    // --- STEP 6: Generate Billing Invoice & Verify Detailed Components ---
    console.log('Clicking Generate Billing Invoice...');
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
      const textMatch = elements.find(el => el.textContent.trim() === 'Generate Billing Invoice' && el.offsetParent !== null);
      if (!textMatch) throw new Error('Generate Billing Invoice button not found');

      let current = textMatch;
      let buttonEl = null;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (current.getAttribute('role') === 'button' || current.tagName === 'BUTTON' || style.cursor === 'pointer' || (current.className && typeof current.className === 'string' && current.className.includes('r-cursor-'))) {
          buttonEl = current;
          break;
        }
        current = current.parentElement;
      }
      if (!buttonEl) buttonEl = textMatch;
      simulateClick(buttonEl);
    });

    console.log('Waiting for billing invoice generation success alert...');
    let invoiceGenSuccess = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      invoiceGenSuccess = await page.evaluate(() => {
        const txt = document.body.textContent;
        return txt.includes('Success') && txt.includes('Invoice generated successfully');
      });
      if (invoiceGenSuccess) break;
    }

    if (invoiceGenSuccess) {
      console.log('SUCCESS: Billing invoice generated successfully.');
    } else {
      await page.screenshot({ path: 'verify_invoice_gen_fail.png' });
      throw new Error('Invoice generation alert not seen');
    }

    // Click "View Invoice" to navigate to Invoice detail page
    console.log('Navigating to InvoiceDetail...');
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
      const textMatch = elements.find(el => el.textContent.trim() === 'View Invoice' && el.offsetParent !== null);
      if (!textMatch) throw new Error('View Invoice button not found');

      let current = textMatch;
      let buttonEl = null;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (current.getAttribute('role') === 'button' || current.tagName === 'BUTTON' || style.cursor === 'pointer' || (current.className && typeof current.className === 'string' && current.className.includes('r-cursor-'))) {
          buttonEl = current;
          break;
        }
        current = current.parentElement;
      }
      if (!buttonEl) buttonEl = textMatch;
      simulateClick(buttonEl);
    });

    console.log('Waiting for InvoiceDetail screen to load data...');
    let invoiceLoaded = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      invoiceLoaded = await page.evaluate(() => {
        return document.body.textContent.includes('Subtotal');
      });
      if (invoiceLoaded) break;
    }
    await page.screenshot({ path: 'verify_invoice_detail_screen.png' });

    // Verify invoice displays detailed charge items
    const checkInvoiceDetailedItems = await page.evaluate(() => {
      const txt = document.body.textContent;
      // It should display detailed items rather than a single package line.
      // For example, it should list Appendectomy surgery item, and other default rates
      // because we store detailed items in the database.
      const hasAppendectomy = txt.includes('Appendectomy');
      const hasSubtotal = txt.includes('Subtotal');
      return { hasAppendectomy, hasSubtotal };
    });

    console.log('Invoice details check:', JSON.stringify(checkInvoiceDetailedItems));
    if (checkInvoiceDetailedItems.hasAppendectomy && checkInvoiceDetailedItems.hasSubtotal) {
      console.log('SUCCESS: Generated billing invoice successfully displays detailed charge items.');
    } else {
      throw new Error('Invoice detail verification failed. It should contain detailed charge components.');
    }

    console.log('--- ALL E2E VERIFICATIONS PASSED SUCCESSFULLY! ---');

  } catch (error) {
    console.error('E2E TEST FAILED:', error.message);
    await page.screenshot({ path: 'verify_billing_defaults_approval_failure.png' });
    process.exitCode = 1;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
