#!/bin/bash
# BD Job SMS Gateway - Termux Runner
# Sends SMS to 16222 via Teletalk when triggered from Chrome Extension

SERVER_URL="${1:-http://192.168.1.15:3000}"
TOKEN="${2:-BT-DEMO}"

echo "========================================="
echo "   BD Job SMS Gateway - Phone Agent"
echo "========================================="
echo "Server URL: $SERVER_URL"
echo "Pairing Token: $TOKEN"
echo "Checking termux-api..."

if ! command -v termux-sms-send &> /dev/null; then
    echo "Installing termux-api..."
    pkg update -y && pkg install -y termux-api jq curl
fi

echo "Registering phone with extension gateway..."
curl -s -X POST "$SERVER_URL/api/sms/pair" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"deviceName\":\"Android Phone (Termux)\",\"phoneModel\":\"Termux Agent\",\"simCarrier\":\"Teletalk\",\"batteryLevel\":90}"
echo ""

echo "Listening for SMS commands from PC... (Press Ctrl+C to stop)"
while true; do
  RESPONSE=$(curl -s "$SERVER_URL/api/sms/pending")
  JOBS=$(echo "$RESPONSE" | jq -r '.jobs[]? | @base64' 2>/dev/null)

  for job_b64 in $JOBS; do
    JOB=$(echo "$job_b64" | base64 -d)
    JOB_ID=$(echo "$JOB" | jq -r '.id')
    RECIPIENT=$(echo "$JOB" | jq -r '.recipient')
    BODY=$(echo "$JOB" | jq -r '.body')

    echo "[$(date +'%T')] Command received: Send SMS to $RECIPIENT -> '$BODY'"
    
    # Send SMS via Android system using termux-api
    termux-sms-send -n "$RECIPIENT" "$BODY"
    
    # Report back to extension
    curl -s -X POST "$SERVER_URL/api/sms/report-sent" \
      -H "Content-Type: application/json" \
      -d "{\"jobId\":\"$JOB_ID\",\"simUsed\":\"Teletalk SIM\"}" > /dev/null

    echo "[$(date +'%T')] ✅ Sent to $RECIPIENT successfully via phone!"
  done

  sleep 2
done
