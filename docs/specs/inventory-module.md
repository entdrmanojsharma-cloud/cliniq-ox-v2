<!-- 
  Purpose: Define the functional specification, database schema impact, 
  API endpoints, screen flows, and test plans for the Inventory Module.
-->
# Feature Spec: Inventory Module

This document details the specifications for managing clinical supplies, medical inventory, and warning triggers.

---

## 1. Functional Specification
- **Stock Management:** Add, update, and search supplies, disposable products, and clinic drugs.
- **Stock Deductions:** Deduct materials/vaccines when doctors issue prescriptions or complete procedures.
- **Low Stock Threshold Alert:** Flag items when current quantity falls below the minimum alert levels.

---

## 2. Database Impact
Requires a new `inventory` table:
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(150) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_threshold INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. API Impact
- **`GET /api/v1/inventory`**: List active stock levels with query sorting by category.
- **`POST /api/v1/inventory`**: Onboard a new supply item or register a batch.
- **`PUT /api/v1/inventory/:id/stock`**: Add or subtract units from the inventory count.

---

## 4. UI Flow
- Login Screen
- → Dashboard
- → Inventory Screen (displays items, stock quantities, and warning icons)
- → Stock Item Form (admin view for adjusting quantities)

---

## 5. Test Plan

### 5.1 Automated Tests
- Test that updating quantity below the `min_threshold` triggers a warning response flag.
- Ensure item names are unique.

### 5.2 Manual Verification
- Add a test item "Surgical Gloves" with quantity `5` (threshold `10`).
- Verify it is highlighted in red on the inventory panel and generates an admin alert.
