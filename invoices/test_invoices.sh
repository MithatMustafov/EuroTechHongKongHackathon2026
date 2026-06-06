#!/usr/bin/env bash

# Use first argument as API URL, otherwise default to localhost:3001
API_URL="${1:-http://localhost:3001/invoices/extract}"

# Get the folder where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Testing invoices in: $SCRIPT_DIR"
echo "API endpoint: $API_URL"
echo ""

shopt -s nullglob
PDF_FILES=("$SCRIPT_DIR"/*.pdf)

if [ ${#PDF_FILES[@]} -eq 0 ]; then
  echo "No PDF files found in: $SCRIPT_DIR"
  exit 1
fi

for file in "${PDF_FILES[@]}"; do
  filename="$(basename "$file")"

  echo "======================================"
  echo "Testing: $filename"
  echo "======================================"

  if command -v jq >/dev/null 2>&1; then
    response="$(curl -s -X POST -F "pdf=@$file" "$API_URL")"
    echo "Invoice:"
    echo "$response" | jq .invoice
    echo "Risk score:"
    echo "$response" | jq .risk_score
  else
    curl -s -X POST -F "pdf=@$file" "$API_URL"
    echo ""
  fi

  echo ""
done
