# TripCraft - EAS Build Commands

## Setup (One-time)
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Initialize EAS project (already done)
eas init
```

## Android APK (Preview/Testing)
```bash
# Build APK for testing (install directly on phone)
eas build --platform android --profile preview

# It will ask "Generate a new Android Keystore?" → Press Y

# After build completes, download APK from the link shown
# Or check builds at: https://expo.dev/accounts/ekanshrajput1607/projects/TripCraft/builds
```

## Android AAB (Play Store Release)
```bash
# Build AAB for Google Play Store submission
eas build --platform android --profile production
```

## iOS (App Store)
```bash
# Build for iOS simulator (testing)
eas build --platform ios --profile preview

# Build for App Store submission
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

## Submit to Stores
```bash
# Submit Android to Google Play
eas submit --platform android

# Submit iOS to App Store
eas submit --platform ios
```

## Check Build Status
```bash
# List all builds
eas build:list

# View latest build
eas build:view

# Check build logs online
# https://expo.dev/accounts/ekanshrajput1607/projects/TripCraft/builds
```

## Update (OTA - Over The Air)
```bash
# Push JS-only updates without rebuilding (instant update)
eas update --branch preview --message "bug fix description"

# Push update to production
eas update --branch production --message "update description"
```

## Credentials Management
```bash
# View/manage Android credentials (keystore)
eas credentials --platform android

# View/manage iOS credentials (certificates, provisioning)
eas credentials --platform ios
```

## Local Development
```bash
# Start Expo dev server (local network)
npx expo start

# Start with tunnel (phone on different network)
npx expo start --tunnel

# Clear Metro cache and restart
npx expo start --tunnel --clear

# Test build without uploading (local)
npx expo export --platform ios
npx expo export --platform android
```

## Backend Commands
```bash
# Start backend locally (with auto-reload)
cd TripCraft-backend && npm run dev

# Start backend (production)
cd TripCraft-backend && npm start

# Backend is deployed at:
# https://trip-craft-backend.vercel.app
```

## Useful Expo Commands
```bash
# Check Expo account
npx expo whoami

# Install Expo-compatible packages
npx expo install <package-name>

# Check for outdated packages
npx expo install --check

# Doctor - check for issues
npx expo-doctor
```

## Environment
- **Expo Account**: ekanshrajput1607
- **Project**: TripCraft
- **Bundle ID (iOS)**: com.tripcraft.app
- **Package (Android)**: com.tripcraft.app
- **Backend URL**: https://trip-craft-backend.vercel.app
- **Firebase Project**: tripcraft-f2e84
