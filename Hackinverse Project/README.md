# VeriMedia Chain

AI + Web3: Provenance & Deepfake Verification

Concept: Authenticate digital media using cryptographic signatures and record hashes on-chain to verify whether media was AI-generated or human-created.

This project uses Firebase authentication, Supabase for data storage, and TanStack Start for SSR with face-api.js for biometric verification.

## Development

Prefer working locally? You need Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Firebase client configuration
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"

# Gemini API key for chatbot
VITE_GEMINI_API_KEY="your-gemini-api-key"

# Optional Supabase config
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-key"
```

## Deployment

### Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Cloudflare Pages

1. Push your code to GitHub
2. Create new project in Cloudflare Pages
3. Connect GitHub repository
4. Add environment variables in Cloudflare dashboard
5. Deploy automatically on push

### Database Migrations

For Supabase, run migrations locally:

```bash
supabase db push
```

Or apply manually in Supabase dashboard:
- `supabase/migrations/20260814120000_add_face_descriptor.sql`
- `supabase/migrations/20260814120001_add_face_match_score.sql`

## Features

- 🔐 **Firebase Authentication** - Secure user authentication
- 🎭 **Face Verification** - Biometric verification using face-api.js
- 🤖 **AI Chatbot** - Gemini-powered assistant for user guidance
- 🔗 **Blockchain Anchoring** - Media provenance on Base Sepolia
- 📊 **Deepfake Analysis** - AI-generated content detection
- 📁 **Supabase Storage** - Profile pictures and media metadata
- 🌙 **Dark Mode** - Theme support with persistence
