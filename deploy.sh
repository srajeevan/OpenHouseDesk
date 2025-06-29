#!/bin/bash

# Open House Webapp - Deployment Script
# This script helps prepare your project for Vercel deployment

echo "🚀 Open House Webapp - Deployment Preparation"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Running pre-deployment checks..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Run TypeScript check
echo "🔍 Checking TypeScript..."
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found. Please fix them before deploying."
    exit 1
fi

echo "✅ TypeScript check passed"

# Run ESLint
echo "🔍 Running ESLint..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  ESLint warnings found. Consider fixing them before deploying."
fi

# Test build
echo "🏗️  Testing production build..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors before deploying."
    exit 1
fi

echo "✅ Build successful"

# Check for environment variables
echo "🔐 Checking environment variables..."

if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Make sure to set up environment variables."
else
    echo "✅ .env.local found"
fi

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - Open House webapp ready for deployment"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        echo "📝 Uncommitted changes found. Committing..."
        git add .
        git commit -m "Pre-deployment updates - $(date)"
        echo "✅ Changes committed"
    else
        echo "✅ No uncommitted changes"
    fi
fi

echo ""
echo "🎉 Pre-deployment checks complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to GitHub/GitLab/Bitbucket"
echo "2. Connect your repository to Vercel"
echo "3. Configure environment variables in Vercel"
echo "4. Set up your custom domain"
echo "5. Update Supabase authentication URLs"
echo ""
echo "📚 Refer to DEPLOYMENT_GUIDE.md for detailed instructions"
echo "📋 Use DEPLOYMENT_CHECKLIST.md to track your progress"
echo ""
echo "🚀 Ready for deployment!"
