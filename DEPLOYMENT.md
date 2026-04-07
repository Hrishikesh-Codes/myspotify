# Deployment Guide

End-to-end instructions for taking MySpotify from localhost to production.

---

## 1. MongoDB Atlas (database)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Click **Build a Database → Free (M0)** → choose a cloud provider and region close to your server.
3. Create a database user: **Security → Database Access → Add New Database User**.  
   Note the username and password — you'll need them for the connection string.
4. Allow network access: **Security → Network Access → Add IP Address → Allow Access from Anywhere** (`0.0.0.0/0`) for Render, or add the specific Render outbound IPs.
5. Click **Connect → Drivers → Node.js** and copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<user>` and `<password>` with the credentials from step 3.  
   Append your database name before the `?`:
   ```
   mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/myspotify?retryWrites=true&w=majority
   ```
   This is your `MONGODB_URI`.

---

## 2. Spotify Developer App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **Create App**.
   - **App name**: MySpotify (or any name)
   - **App description**: Personal Spotify stats app
   - **Redirect URIs** — add both:
     - `https://localhost:5000/api/auth/callback` (local dev — Spotify requires HTTPS even for localhost)
     - `https://your-server.onrender.com/api/auth/callback` (production — fill in after Render deploy)
   - Check **Web API** under "Which API/SDKs are you planning to use?"
3. Click **Save**, then open the app settings to find your **Client ID** and **Client Secret**.
4. **Development Mode allowlist** — while your app is in Development Mode (default), only users you add explicitly can log in:
   - Go to **Settings → User Management**.
   - Click **Add User** and enter the Spotify account email address (yours, and any testers).
   - Submit a quota extension request on the dashboard if you need more than 25 users.

---

## 3. Deploy the Server to Render

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New → Web Service**.
3. Connect your GitHub repo and select it.
4. Configure the service:
   | Field | Value |
   |---|---|
   | **Name** | `myspotify-server` |
   | **Root Directory** | `server` |
   | **Runtime** | Node |
   | **Build Command** | `npm ci && npm run build` |
   | **Start Command** | `npm start` |
   | **Instance Type** | Free |
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your Atlas connection string from step 1 |
   | `SPOTIFY_CLIENT_ID` | From Spotify dashboard |
   | `SPOTIFY_CLIENT_SECRET` | From Spotify dashboard |
   | `SPOTIFY_REDIRECT_URI` | `https://your-server.onrender.com/api/auth/callback` |
   | `SESSION_SECRET` | A long random string (e.g. run `openssl rand -base64 32`) |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (fill in after Vercel deploy) |
   | `PORT` | `5000` |
6. Click **Create Web Service**. Render will build and deploy.  
   Your server URL will be `https://myspotify-server.onrender.com` (or similar).
7. Go back to your Spotify Developer App → Settings → Redirect URIs and add the production callback URL if you haven't already.

> **Note**: The Render free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. Upgrade to a paid plan or use a cron ping to keep it warm.

---

## 4. Deploy the Client to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**.
2. Import your GitHub repository.
3. Configure the project:
   | Field | Value |
   |---|---|
   | **Framework Preset** | Vite |
   | **Root Directory** | `client` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
   | **Install Command** | `npm ci --legacy-peer-deps` |
4. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-server.onrender.com` |
5. Click **Deploy**.  
   Your app URL will be `https://your-app.vercel.app`.
6. Go back to Render and update `FRONTEND_URL` to your Vercel URL.
7. In the Vite dev proxy (`client/vite.config.ts`) the `/api` prefix is already handled — in production, API calls go to the same origin through Vercel's rewrite rules. Add a `vercel.json` in the `client` folder if you need explicit rewrites:

   ```json
   {
     "rewrites": [
       { "source": "/api/:path*", "destination": "https://your-server.onrender.com/api/:path*" }
     ]
   }
   ```

---

## 5. Verify the Full Flow

1. Visit your Vercel URL.
2. Click **Connect with Spotify** — you should be redirected to Spotify's authorization page.
3. Log in with an account that's on the Development Mode allowlist.
4. After authorizing, you should be redirected back to the app and see your dashboard.
5. Check the **My Stats** section — Mood Trends, Listening Patterns, and Taste DNA should all load data.

---

## Environment Variable Reference

### Server (`server/.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/myspotify
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=https://localhost:5000/api/auth/callback
SESSION_SECRET=any-long-random-string
FRONTEND_URL=http://localhost:5173
```

### Client (`client/.env`)
```env
# Only needed if overriding the Vite dev proxy
VITE_API_URL=http://localhost:5000
```
