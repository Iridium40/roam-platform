# ROAM Admin Panel - PWA Setup

This document describes the Progressive Web App (PWA) setup for the ROAM Admin Panel.

## What's Included

```
roam-admin-app/
├── public/
│   ├── manifest.json          # Web app manifest
│   ├── sw.js                  # Service worker
│   ├── offline.html           # Offline fallback page
│   ├── browserconfig.xml      # Windows tile config
│   └── icons/                 # App icons (need to be generated)
│       └── roam-admin-icon.svg
├── client/
│   ├── hooks/
│   │   └── usePWA.ts          # PWA status & install hook
│   └── components/
│       └── pwa/
│           ├── index.ts
│           ├── PWAInstallBanner.tsx   # Install prompt banner
│           ├── OfflineIndicator.tsx   # Offline status bar
│           └── ServiceWorkerRegistration.tsx
├── scripts/
│   └── generate-pwa-icons.sh  # Icon generation script
└── index.html                 # Updated with PWA meta tags
```

## Features

### 1. Install Banner
- Shows a prompt to install the app on supported browsers
- Remembers dismissal for 7 days
- Appears after 3 seconds of page load

### 2. Offline Support
- Service worker caches static assets
- Shows offline page when network is unavailable
- Automatically reloads when connection is restored

### 3. Offline Indicator
- Yellow banner at top of screen when offline
- Automatically hides when back online

### 4. App Shortcuts
- Dashboard
- Users
- Bookings
- Businesses

## Generating Icons

### Option 1: Using ImageMagick (Recommended)

Install ImageMagick:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt install imagemagick
```

Run the icon generation script:
```bash
cd roam-admin-app
./scripts/generate-pwa-icons.sh

# Or with a custom source image:
./scripts/generate-pwa-icons.sh /path/to/your/logo.png
```

### Option 2: Online Tools

Use one of these free online tools:
- [PWA Builder Image Generator](https://www.pwabuilder.com/imageGenerator)
- [Real Favicon Generator](https://realfavicongenerator.net)
- [Maskable.app](https://maskable.app/editor) - For maskable icons

Upload a 512x512 PNG and download the generated icons to `public/icons/`.

### Required Icon Sizes

Place these files in `public/icons/`:
- icon-16x16.png
- icon-32x32.png
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-167x167.png
- icon-180x180.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png
- favicon.ico

Optional:
- icon-maskable-512x512.png (for Android adaptive icons)
- safari-pinned-tab.svg
- shortcut-dashboard.png (96x96)
- shortcut-users.png (96x96)
- shortcut-bookings.png (96x96)
- shortcut-businesses.png (96x96)

## Testing the PWA

### Chrome DevTools

1. Open DevTools → Application tab
2. Check "Manifest" section for errors
3. Check "Service Workers" section for registration
4. Use "Install" button in manifest section to test

### Lighthouse Audit

1. DevTools → Lighthouse tab
2. Check "Progressive Web App"
3. Run audit
4. Fix any issues reported

### Mobile Testing

1. Open your app on a mobile device
2. Wait a few seconds
3. Look for browser install prompt or banner
4. On iOS: Safari → Share → "Add to Home Screen"

## PWA Install Criteria

Browsers will show the install prompt when:

1. ✅ `manifest.json` with required fields (name, icons, start_url, display)
2. ✅ Service worker registered
3. ✅ Served over HTTPS
4. ✅ User has engaged with the page (clicked, scrolled, etc.)

## iOS Specific Notes

iOS Safari has limited PWA support:
- No `beforeinstallprompt` event (banner won't show automatically)
- Users must manually use "Add to Home Screen"
- Consider adding iOS-specific instructions in the UI

## Customization

### Change Theme Color

Update in these files:
- `public/manifest.json` → `theme_color`
- `index.html` → `<meta name="theme-color">`
- `public/sw.js` → (if you want to update cache name)
- Components use `#3b5998` (ROAM Admin blue)

### Change App Name

Update in:
- `public/manifest.json` → `name` and `short_name`
- `index.html` → `<title>` and meta tags

### Customize Install Banner

Edit `client/components/pwa/PWAInstallBanner.tsx`:
- Change colors, text, timing
- Add your logo
- Modify dismiss behavior

### Customize Offline Page

Edit `public/offline.html`:
- Match your brand colors
- Add your logo
- Customize messaging

## Troubleshooting

### Install prompt not showing?

1. Check you're on HTTPS (or localhost)
2. Check manifest.json is valid (no JSON errors)
3. Check service worker is registered (DevTools → Application)
4. Make sure icons exist and are accessible
5. Try incognito mode (clears previous dismissals)

### Service worker not updating?

1. Increment `CACHE_NAME` in `sw.js` (e.g., `roam-admin-v2`)
2. Or unregister manually in DevTools → Application → Service Workers

### Offline page not showing?

1. Check `/offline.html` is accessible
2. Verify it's in the `STATIC_ASSETS` array in `sw.js`
3. Test by going offline in DevTools → Network → Offline

## Deployment

The PWA will work automatically when deployed to Vercel (or any HTTPS host).

Make sure to:
1. Generate and commit the icon files
2. Test the install flow on the production URL
3. Verify the service worker is registered correctly
