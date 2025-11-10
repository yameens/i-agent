#!/bin/bash

# Diligence Dialer - Vercel Deployment Script

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    Deploying to Vercel                                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel..."
    vercel login
fi

echo ""
echo "🔍 Checking environment..."
echo ""

# Check for .env.local or .env.production
if [ ! -f .env.local ] && [ ! -f .env.production ]; then
    echo "⚠️  Warning: No .env.local or .env.production found"
    echo "   Make sure to set environment variables in Vercel dashboard"
    echo ""
fi

# Run build test locally
echo "🧪 Testing build locally..."
echo ""
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
else
    echo ""
    echo "❌ Build failed. Fix errors before deploying."
    exit 1
fi

# Ask for deployment type
echo "Choose deployment type:"
echo "  1) Preview (for testing)"
echo "  2) Production"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying preview..."
        echo ""
        vercel
        ;;
    2)
        echo ""
        echo "🚀 Deploying to production..."
        echo ""
        vercel --prod
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify deployment at the provided URL"
echo "   2. Test dashboard features"
echo "   3. Update Twilio webhooks if needed"
echo "   4. Update NEXT_PUBLIC_APP_URL in Vercel if first deploy"
echo ""
echo "🔧 Useful commands:"
echo "   vercel logs --follow     # Watch logs"
echo "   vercel env ls            # List environment variables"
echo "   vercel rollback          # Rollback deployment"
echo ""

