# Portfolio Reaction Backend

A tiny Express server that stores emoji reaction counts for your portfolio page,
shared across every visitor and device. Counts persist in `data.json`.

## How it works

- `GET /api/reactions?clientId=xxxx` → returns global counts + which emojis *this* client already picked
- `POST /api/reactions/toggle` with `{ clientId, emoji }` → toggles that reaction, adjusts the global count by ±1

The frontend generates a random anonymous `clientId` and stores it in `localStorage`
just so it knows which reactions *you* picked (to show them as active / let you undo them).
The actual counts live on the server, so they're the same for everyone, on every device.

## Run it locally

```bash
cd reaction-backend
npm install
npm start
```

Server runs on `http://localhost:3001` by default (override with `PORT=xxxx`).

## Deploy it for free

Any of these work well for a tiny Node/Express app like this one:

### Render (easiest)
1. Push this `reaction-backend` folder to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect the repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Deploy. You'll get a URL like `https://your-app.onrender.com`.

### Railway
1. Push to GitHub, go to https://railway.app → New Project → Deploy from repo.
2. It auto-detects Node and runs `npm start`. You'll get a public URL.

### Fly.io / Cyclic / Glitch
All support plain Node/Express apps in a similar way — push code, get a URL.

⚠️ Note on free tiers: some platforms (e.g. Render's free tier) spin the server down
after inactivity and use ephemeral disk, meaning `data.json` can reset on redeploy/restart.
If you want counts to survive that long-term, swap the JSON file for a small database
(e.g. a free tier of Supabase, MongoDB Atlas, or Upstash Redis) — happy to help wire
that up if you get to that point.

## Connect it to your portfolio

Once deployed, open `portfolio.html` and set:

```js
const API_BASE_URL = "https://your-app.onrender.com";
```

near the top of the reactions `<script>` block. That's it — the reaction bar will
now read/write through your live backend instead of local-only storage.
