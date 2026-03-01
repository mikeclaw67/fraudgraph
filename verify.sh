#!/bin/bash
echo "=== FraudGraph Verify ==="
for dir in backend data ml frontend tests; do [ -d "$dir" ] && echo "  ok $dir/" || echo "  MISSING: $dir/"; done
find backend ml data -name "*.py" 2>/dev/null | while read f; do python3 -m py_compile "$f" && echo "  ok $f" || echo "  ERR: $f"; done
[ -d tests ] && python3 -m pytest tests/ -v --tb=short 2>&1 | tail -20
echo "=== Done ===" 