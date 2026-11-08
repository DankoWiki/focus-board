# Focus Board

The installable, offline version of Focus Board. Everything it needs is in this folder: no CDN, no server, no account.

## Put it online (GitHub Pages)

1. Create a public repository named `focus-board` under `dankowiki`.
2. Upload everything in this folder to the root of the repository, keeping the `fonts`, `icons` and `vendor` folders and the `.nojekyll` file.
3. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, then `main` and `/ (root)`.
4. After a minute the app is at **https://dankowiki.github.io/focus-board/**.

If you pick another repository name, the address changes to match. The claude.ai version links to the address above, so tell Claude the new one.

## Install it on your phone

- **Android (Chrome):** open the address, then tap **Install** on the banner, or use the menu → **Install app**.
- **iPhone (Safari):** open the address, tap **Share**, then **Add to Home Screen**.

After installing, open **Settings → Notifications** in the app and tap **Turn on**.

## Notifications

- **Reminders** fire at their set time while the app is open or still running in the background.
- **Morning summary:** once a day, a notification lists what is due today or overdue, even when the app is closed. This works when the app is installed with Chrome on Android, which decides the exact time (usually once a day, between 7:00 and 22:00). iPhone does not run it.
- Exact-time reminders with the app fully closed would need either a push server or a native wrapper (for example Expo with `expo-notifications`).

## Move your boards from claude.ai

1. In the claude.ai version: **Settings → Copy backup as text**.
2. In the installed app: **Settings → Paste backup**, paste, then choose **Add to my boards** or **Replace everything**.

## Your data

Boards live in the app's storage on this phone only. Use **Settings → Export backup** now and then, so you can restore if the app or browser data is cleared.

## Updating

Replace the files in the repository with a newer build. The next time the app opens online, it shows "A new version of Focus Board is ready" with a **Reload** button.
