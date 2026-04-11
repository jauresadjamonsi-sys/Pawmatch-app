#!/bin/bash
# ═══════════════════════════════════════════════════
# PawMatch (Pawly) — Deploy + auto-alias bare domain
# ═══════════════════════════════════════════════════
set -e

echo "🚀 Deploying PawMatch to Vercel production..."
OUTPUT=$(npx vercel --prod --yes 2>&1)
echo "$OUTPUT"

# Extract deployment URL from JSON output (macOS compatible)
DEPLOY_URL=$(echo "$OUTPUT" | sed -n 's/.*"url": *"\(https:\/\/[^"]*\)".*/\1/p' | head -1)

if [ -z "$DEPLOY_URL" ]; then
  echo "⚠️  Could not extract from JSON. Trying vercel inspect..."
  DEPLOY_URL=$(echo "$OUTPUT" | grep -o 'https://pawlyapp[^ "]*\.vercel\.app' | head -1)
fi

if [ -n "$DEPLOY_URL" ]; then
  echo ""
  echo "🔗 Updating bare domain alias..."
  npx vercel alias set "$DEPLOY_URL" pawlyapp.ch
  echo ""
  echo "✅ Done! Both domains now point to latest deployment:"
  echo "   www.pawlyapp.ch → $DEPLOY_URL"
  echo "   pawlyapp.ch     → $DEPLOY_URL"
else
  echo "❌ Could not extract deployment URL. Run manually:"
  echo "   npx vercel alias set <deployment-url> pawlyapp.ch"
fi
