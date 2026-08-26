# CHIPSET - Pass & QR Verification System

A secure, yellow-themed personalized invitation pass generator and verification system built for **CHIPSET - A Technical Community**.

## Features
- **Official CHIPSET Branding**: Vector-precise technical community lightbulb and motherboard circuit traces embedded on every pass.
- **Cryptographically Secure IDs**: Unique `C9-XXXXXX` participant codes.
- **Anti-Fake Authority**: Server-side database verification acts as the single source of truth against photoshopped screenshots.
- **High-Resolution Pass Generation**: Single PNG card downloads and bulk `.ZIP` batch generator.
- **Live Camera Scanner & Entrance Terminal**: Real-time camera scanner with audio/visual validation and duplicate check-in prevention.
- **Admin Dashboard**: Real-time stats, participant CRUD, CSV/Excel import/export, and audit logs.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

## Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit of Chipset Pass & QR Verification System"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```
