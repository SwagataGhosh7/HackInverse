# Deployment Guide

This guide covers deploying VeriMedia Chain to both Vercel and Cloudflare Pages.

## Prerequisites

- Node.js 18+ installed
- Firebase project configured
- Supabase project configured (optional, for data storage)
- Gemini API key for chatbot

## Environment Variables

### Required Variables

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Gemini API Key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Optional Variables

```bash
# Supabase (if using for data storage)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Vercel Deployment

### 1. Prepare for Deployment

```bash
# Install dependencies
npm install

# Build locally to test
npm run build
```

### 2. Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure environment variables in Vercel dashboard
5. Click "Deploy"

### 3. Environment Variables in Vercel

In your Vercel project settings → Environment Variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL` (optional)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (optional)

### 4. Automatic Deployments

Vercel will automatically deploy when you push to your connected branch.

## Cloudflare Pages Deployment

### 1. Prepare for Deployment

```bash
# Install dependencies
npm install

# Build locally to test
npm run build
```

### 2. Deploy via Cloudflare Pages Dashboard

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to Pages → Create a project
3. Connect to your Git repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `.output/public`
5. Add environment variables
6. Click "Save and Deploy"

### 3. Environment Variables in Cloudflare

In your Cloudflare Pages project settings → Environment Variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL` (optional)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (optional)

### 4. Automatic Deployments

Cloudflare Pages will automatically deploy when you push to your connected branch.

## Database Setup

### Supabase Migrations

If using Supabase for data storage, run the migrations:

```bash
# Using Supabase CLI
supabase db push

# Or manually apply in Supabase dashboard:
# 1. Go to SQL Editor
# 2. Run the contents of supabase/migrations/*.sql files
```

### Required Migrations

- `20260814120000_add_face_descriptor.sql` - Adds face_descriptor column to profiles
- `20260814120001_add_face_match_score.sql` - Adds face_match_score column to registrations

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Test face verification functionality
- [ ] Test media registration flow
- [ ] Test chatbot functionality
- [ ] Verify blockchain integration works
- [ ] Check mobile responsiveness
- [ ] Test deepfake analysis feature

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Run type check
npm run typecheck

# Run linter
npm run lint
```

### Environment Variable Issues

Ensure all environment variables are prefixed with `VITE_` for client-side access.

### Face API Models

The face-api.js models are included in `public/models/` and should be automatically deployed. Verify they're accessible after deployment.

## Security Notes

- Never commit `.env` files to version control
- Use different API keys for development and production
- Regularly rotate API keys
- Enable authentication on all Supabase tables
- Use proper CORS settings for Firebase
- Keep dependencies updated regularly

## Performance Optimization

- The app uses TanStack Start for SSR
- Static assets are cached via Cloudflare/Vercel CDN
- Face API models are cached with long expiry
- Images are optimized through Supabase Storage

## Monitoring

Set up monitoring for:
- Build success/failure rates
- Error rates (via Firebase Crashlytics or similar)
- Performance metrics
- User engagement metrics
