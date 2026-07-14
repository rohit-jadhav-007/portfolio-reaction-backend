# Portfolio Reaction Backend

A tiny Express server that stores emoji reaction counts for your portfolio page,
shared across every visitor and device. Counts persist in **Upstash Redis** (free tier),
so they survive server restarts — unlike a local JSON file, which free hosts like
Render wipe every time the server spins down and back up.

## How it works

- `GET /api/reactions?clientId=xxxx` → returns global counts + which emojis *this* client already picked
- `POST /api/reactions/toggle` with `{ clientId, emoji }` → toggles that reaction, adjusts the global count by ±1

The frontend generates a random anonymous `clientId` and stores it in `localStorage`
just so it knows which reactions *you* picked (to show them as active / let you undo them).
The actual counts live in Redis, so they're the same for everyone, on every device.

## 1. Create a free Upstash Redis database

1. Go to https://upstash.com → sign up (GitHub login works)
2. **Create Database** → any name → pick a region
3. On the database page, open the **REST API** tab and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2. Run it locally

```bash
cd reaction-backend
npm install
export UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
export UPSTASH_REDIS_REST_TOKEN="xxxxxxxx"
npm start
```

Server runs on `http://localhost:3001` by default (override with `PORT=xxxx`).

## 3. Deploy it for free (Render)

1. Push this `reaction-backend` folder to a GitHub repo.
2. https://render.com → New → Web Service → connect the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. **Important:** in the Render dashboard, go to **Environment** and add:
   - `UPSTASH_REDIS_REST_URL` = (paste your value)
   - `UPSTASH_REDIS_REST_TOKEN` = (paste your value)
5. Deploy. You'll get a URL like `https://your-app.onrender.com`.

Because the counts now live in Redis (not on Render's disk), they'll survive Render
restarting your server after inactivity — which is exactly the free tier's normal behavior.

## Connect it to your portfolio

Once deployed, open `portfolio.html` / `index.html` and set:

```js
const API_BASE_URL = "https://your-app.onrender.com";
```

near the top of the reactions `<script>` block, then commit + push.

## Troubleshooting

- **Counts reset after a while / after redeploying** → you're missing the two
  `UPSTASH_REDIS_REST_URL` / `TOKEN` environment variables on Render, or they're wrong.
  Check the server logs on Render — it prints a warning if they're missing.
- **Nothing happens when clicking a reaction** → open browser DevTools → Console/Network
  tab and check for CORS or 404 errors; confirm `API_BASE_URL` matches your Render URL exactly
  (no trailing slash).
- **First click after a while is slow** → normal on Render's free tier; the server was
  asleep and takes ~20–30 seconds to wake up.
