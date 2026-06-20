with open("/Users/Shared/Mobile app cliniq-OX/backend/modules/documents/templates/estimate/charges-section.js", "r") as f:
    content = f.read()

# Fix Operating Theater Charge text
old_ot_charge = "<td>Operating Theater Charge (Est. ${data.expectedDurationMinutes} min)</td>"
new_ot_charge = "<td>Operating Theater Charge</td>"
content = content.replace(old_ot_charge, new_ot_charge)

# Fix Anaesthesia Service Charge text
old_anaesthesia_charge = "<td>Anaesthesia Service Charge</td>"
new_anaesthesia_charge = "<td>Anaesthesia Charge</td>"
content = content.replace(old_anaesthesia_charge, new_anaesthesia_charge)

with open("/Users/Shared/Mobile app cliniq-OX/backend/modules/documents/templates/estimate/charges-section.js", "w") as f:
    f.write(content)
