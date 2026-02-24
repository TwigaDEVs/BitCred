#!/bin/bash
# Backend verification script

echo "🔍 Checking Backend Data Source..."
echo ""

# Check if backend is using mock data
cd ~/hack/BitCred/backend

echo "1. Checking for mock endpoints:"
grep -n "mock" api/main.py 2>/dev/null || echo "  ✅ No mock endpoints found"

echo ""
echo "2. Checking scoring function:"
grep -A 5 "async def compute_credit_score" api/main.py 2>/dev/null | head -10

echo ""
echo "3. Testing API with real address:"
curl -s -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"btc_address": "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97", "submit_onchain": false}' \
  | python3 -m json.tool | grep -E '"score"|"hodl_sub"|"frequency_sub"|"stability_sub"'

echo ""
echo "4. Check if scores vary with different addresses:"
echo "Score 1 (Satoshi):"
curl -s -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"btc_address": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "submit_onchain": false}' \
  | python3 -m json.tool | grep '"score"'

echo ""
echo "Score 2 (Different address):"
curl -s -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{"btc_address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "submit_onchain": false}' \
  | python3 -m json.tool | grep '"score"'

echo ""
echo "✅ If scores are different, backend is using REAL data"
echo "❌ If scores are same (686), backend has hardcoded values"