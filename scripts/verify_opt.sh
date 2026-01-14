
# 1. Test Analyze API (Batching)
echo "Testing /api/analyze..."
curl -X POST http://localhost:8080/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "明日の天気はどうですか"}'

# 2. Test Caching (Translate)
echo -e "\n\nTesting Caching (Run 1 - Slow)..."
# Measure time
start_time=$(date +%s%N)
curl -X POST http://localhost:8080/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは"}'
end_time=$(date +%s%N)
elapsed=$(( (end_time - start_time) / 1000000 ))
echo "Time 1: ${elapsed}ms"

echo -e "\nTesting Caching (Run 2 - Fast)..."
start_time=$(date +%s%N)
curl -X POST http://localhost:8080/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは"}'
end_time=$(date +%s%N)
elapsed=$(( (end_time - start_time) / 1000000 ))
echo "Time 2: ${elapsed}ms"

# 3. Test Validation (Max Length)
echo -e "\nTesting Validation..."
long_text=$(printf 'a%.0s' {1..501})
curl -X POST http://localhost:8080/api/translate \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$long_text\"}"
