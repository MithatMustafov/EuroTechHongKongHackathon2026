#!/usr/bin/env bash

# Use first argument as API URL, otherwise default to the new analyze endpoint
API_URL="${1:-http://localhost:3001/invoices/analyze}"

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

  response="$(curl -s -X POST -F "pdf=@$file" "$API_URL")"

  if command -v jq >/dev/null 2>&1; then
    echo "Invoice:"
    echo "$response" | jq .invoice

    echo "Risk score:"
    echo "$response" | jq .risk_score

    echo "Rail decision:"
    echo "$response" | jq .rail_decision

    echo "Final decision:"
    echo "$response" | jq .final_decision
  else
    echo "$response"
  fi

  echo ""
done