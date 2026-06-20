#!/bin/bash
# Test discount codes API

echo "=== 1. Login ==="
LOGIN_RESP=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@cliniqox.com","password":"password123"}')
echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('Login success:', d.get('success'))"

TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))")
echo "Token obtained: ${#TOKEN} chars"

echo ""
echo "=== 2. List Discount Codes ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/discount-codes | \
  python3 -c "import sys,json; d=json.load(sys.stdin); codes=d.get('data',{}).get('discountCodes',[]); print('Total codes:', len(codes)); [print(' -', c.get('code'), '|', c.get('discountType'), c.get('value'), '%' if c.get('discountType')=='PERCENTAGE' else 'flat', '| active:', c.get('isActive')) for c in codes]"

echo ""
echo "=== 3. Validate a discount code ==="
if [ ${#TOKEN} -gt 10 ]; then
  # Get the first code from DB
  FIRST_CODE=$(cd "/Users/Shared/Mobile app cliniq-OX/backend" && node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.discountCode.findFirst({select:{code:true}}).then(c=>console.log(c?.code||'NONE')).finally(()=>p.\$disconnect())")
  echo "Testing code: $FIRST_CODE"
  curl -s -X POST http://localhost:3000/api/v1/discount-codes/validate \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"code\":\"$FIRST_CODE\"}" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps(d, indent=2))"
fi

echo ""
echo "=== 4. Check Estimates API ==="
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/estimates?limit=2 | \
  python3 -c "import sys,json; d=json.load(sys.stdin); ests=d.get('data',{}).get('estimates',[]); print('Estimates found:', len(ests))"

echo ""
echo "=== DONE ==="
