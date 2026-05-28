# Life Dashboard

A personal life dashboard that lives entirely on your Mac. Track health, food, finances, goals, projects, and side hustles — all in one place. No accounts, no cloud, no subscriptions.

---

## How to start the app each day

### Option A — Native Mac app (recommended) ✨

Double-click **`launch-dashboard.command`** in the project folder.

It will:
1. Start the server in the background
2. Open **Life Dashboard** as a real Mac app with a dock icon

> First time only: macOS may say it "can't be opened because it's from an unidentified developer." Right-click it → **Open** → **Open** to allow it just once.

To put it in your Dock: open `launch-dashboard.command` once, then find **Terminal** in the Dock while it's running, right-click → **Options → Keep in Dock**. Or drag **Life Dashboard.app** from `/Applications` into your Dock directly.

---

### Option B — Browser (also works)

1. Open **Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. Run:
   ```
   cd "/Users/logan/Desktop/home life/Claude/Projects/life-dashboard" && npm run dev
   ```
3. Open your browser and go to: **http://localhost:3000**

Leave Terminal open while using the app. Press `Ctrl + C` to stop it.

---

## How to access from your phone

Your phone and Mac must be on the **same Wi-Fi network**.

1. On your Mac: go to **System Settings → Network → Wi-Fi → Details**
2. Look for the **IP Address** — it will look like `192.168.1.42`
3. On your phone: open Safari and go to `http://192.168.1.42:3000`
   (replace `192.168.1.42` with your actual IP)
4. Tap the **Share** button → **Add to Home Screen** for an app-like icon

> If the page doesn't load, make sure `npm run dev` is still running on your Mac.

---

## Where my data lives

All your data is stored in a single file:

```
[project folder]/data/dashboard.db
```

**To back it up:** copy that file to an external drive, iCloud, or anywhere safe. If you ever lose it, your data is gone — back it up regularly!

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "command not found: npm" | Node.js isn't installed. Download from nodejs.org |
| Page won't load | Make sure `npm run dev` is running in Terminal |
| Phone can't connect | Check Mac and phone are on the same Wi-Fi |
| App looks broken | Restart Terminal, run `npm run dev` again |
