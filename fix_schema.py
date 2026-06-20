with open("/Users/Shared/Mobile app cliniq-OX/backend/database/schema.prisma", "r") as f:
    content = f.read()

# Let's remove notifications   Notification[] from Patient
# Patient is lines 260-280.
# Let's target the exact block in Patient
patient_block = """  refunds        Refund[]
  advanceBalances AdvanceBalance[]
  notifications   Notification[]"""

fixed_patient_block = """  refunds        Refund[]
  advanceBalances AdvanceBalance[]"""

content = content.replace(patient_block, fixed_patient_block)

# Also let's clean up any duplicate Notification models at the end if any
# Let's write it back
with open("/Users/Shared/Mobile app cliniq-OX/backend/database/schema.prisma", "w") as f:
    f.write(content)
