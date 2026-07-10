# QuizLive 🎮

Real-time multiplayer quiz platform built with Next.js 14, Firebase, and Tailwind CSS.

## Features

- **Host quizzes** — create, edit, and publish quizzes with drag-and-drop reordering
- **Live game rooms** — 6-digit PIN system for instant player joining
- **Real-time gameplay** — speed-based scoring, streaks, live leaderboard
- **Player experience** — join without an account, colorful Kahoot-style answer buttons
- **Podium + confetti** — celebration screen for the top players

## Tech Stack

- **Next.js 14** (App Router, static export)
- **Firebase Auth** — email/password + Google Sign-In
- **Firestore** — quiz data, user profiles, game records
- **Firebase Realtime Database** — live game state
- **Tailwind CSS** — custom Kahoot-style colors
- **@dnd-kit** — drag-and-drop question reordering
- **canvas-confetti** — podium celebration

## Setup

1. Clone the repository
2. Copy `.env.local.example` to `.env.local` and fill in your Firebase config
3. Install dependencies: `npm install`
4. Run locally: `npm run dev`

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google)
3. Create a **Firestore** database
4. Create a **Realtime Database**
5. Deploy security rules: `firebase deploy --only firestore:rules,database`

## Deploying to Firebase Hosting

This repo uses GitHub Actions for CI/CD. Push to `main` triggers a build and deploy.

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

- `FIREBASE_SERVICE_ACCOUNT` — Firebase service account JSON
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_DATABASE_URL`

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Login & signup
│   ├── dashboard/        # Quiz management
│   ├── quiz/             # Quiz editor
│   ├── game/             # Host lobby
│   ├── host/             # Host game controller
│   ├── join/             # Player join flow
│   └── play/             # Player game screen
├── components/
│   ├── game/             # Timer, AnswerButton, Leaderboard, Confetti
│   ├── quiz/             # QuizEditor with DnD
│   └── ui/               # Button, Input, Card, Modal, Navbar
├── contexts/             # AuthContext
├── hooks/                # useGame, useCountdown
├── lib/                  # Firebase, Firestore, RTDB, scoring, utils
└── types/                # TypeScript types
```

## License

MIT
