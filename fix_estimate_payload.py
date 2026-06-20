with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "r") as f:
    content = f.read()

# Remove Anaesthesia from items
old_anaesthesia_item = """        // Anaesthesia as item
        if (enableAnaesthesia) {
          allItems.push({
            chargeCategory: 'Anaesthesia',
            description: `Anaesthesia – ${anaesthesiaType} (${anaesthesiaPricingMode === 'FIRST_HR' ? 'First Hr + Cons.' : anaesthesiaPricingMode})`,
            quantity: anaesthesiaPricingMode === 'FIXED' ? 1 : parseInt(anaesthesiaUnits, 10) || 1,
            rate: anaesthesiaPricingMode === 'FIXED' ? getAnaesthesiaTotal() : (anaesthesiaPricingMode === 'PER_UNIT' ? Number(anaesthesiaCost) || 0 : getAnaesthesiaTotal()),
            discountType: 'PERCENTAGE',
            discountValue: Number(anaesthesiaDiscountValue) || 0,
            itemGroup: 'ANAESTHESIA'
          });
        }"""
content = content.replace(old_anaesthesia_item, "")

# Remove overwrite for FIRST_HR
old_first_hr = """      // Overwrite for FIRST_HR if enabled
      const anaesItem = allItems.find(i => i.itemGroup === 'ANAESTHESIA');
      if (anaesItem && anaesthesiaPricingMode === 'FIRST_HR') {
        anaesItem.quantity = 1;
        anaesItem.rate = getAnaesthesiaTotal();
      }"""
content = content.replace(old_first_hr, "")

# Set serviceDailyRate: 0 in payload
payload_start = "        icuDiscountValue: Number(icuDiscountValue) || 0,"
payload_end = "        icuDiscountValue: Number(icuDiscountValue) || 0,\n        serviceDailyRate: 0,"
content = content.replace(payload_start, payload_end)

with open("/Users/Shared/Mobile app cliniq-OX/frontend/features/estimates/EstimateFormScreen.js", "w") as f:
    f.write(content)
