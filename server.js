// Tiny reaction backend for the portfolio page.
// - Keeps ONE global count per emoji (shared across every visitor/device).
// - Remembers which emojis a given device already picked (so it can't double count),
//   using an anonymous client id that the frontend generates and stores itself.
// - Data is persisted in Upstash Redis, so counts survive server restarts/redeploys
//   (unlike a local JSON file, which free hosts like Render wipe on every restart).

const express = require('express');
const cors = require('cors');
const { Redis } = require('@upstash/redis');

const app = express();
const PORT = process.env.PORT || 3001;

const EMOJIS = ['🔥', '👏', '🚀', '💡', '❤️'];
const COUNTS_KEY = 'reactions:counts';
const CLIENT_KEY_PREFIX = 'reactions:client:'; // + clientId

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn(
    'WARNING: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
    'Set them as environment variables (see README.md) or counts will not persist.'
  );
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

app.use(cors());
app.use(express.json());

// ---- storage helpers -------------------------------------------------

async function getCounts() {
  const stored = await redis.hgetall(COUNTS_KEY);
  const counts = {};
  EMOJIS.forEach((e) => {
    counts[e] = (stored && stored[e]) ? Number(stored[e]) : 0;
  });
  return counts;
}

async function getClientReactions(clientId) {
  const list = await redis.smembers(CLIENT_KEY_PREFIX + clientId);
  return list || [];
}

// ---- routes ------------------------------------------------------------

app.get('/api/reactions', async (req, res) => {
  try {
    const clientId = req.query.clientId || '';
    const [counts, mine] = await Promise.all([
      getCounts(),
      clientId ? getClientReactions(clientId) : Promise.resolve([]),
    ]);
    res.json({ counts, mine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load reactions' });
  }
});

app.post('/api/reactions/toggle', async (req, res) => {
  try {
    const { clientId, emoji } = req.body || {};

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({ error: 'clientId is required' });
    }
    if (!EMOJIS.includes(emoji)) {
      return res.status(400).json({ error: 'unsupported emoji' });
    }

    const clientKey = CLIENT_KEY_PREFIX + clientId;
    const alreadyReacted = await redis.sismember(clientKey, emoji);
    let turningOn;

    if (alreadyReacted) {
      await redis.srem(clientKey, emoji);
      await redis.hincrby(COUNTS_KEY, emoji, -1);
      turningOn = false;
    } else {
      await redis.sadd(clientKey, emoji);
      await redis.hincrby(COUNTS_KEY, emoji, 1);
      turningOn = true;
    }

    const [counts, mine] = await Promise.all([
      getCounts(),
      getClientReactions(clientId),
    ]);

    res.json({ counts, mine, turningOn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to toggle reaction' });
  }
});

app.get('/', (req, res) => {
  res.send('Portfolio reaction backend is running. Try GET /api/reactions');
});

app.listen(PORT, () => {
  console.log(`Reaction backend listening on http://localhost:${PORT}`);
});
