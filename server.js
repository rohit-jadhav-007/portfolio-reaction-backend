// Tiny reaction backend for the portfolio page.
// - Keeps ONE global count per emoji (shared across every visitor/device).
// - Remembers which emojis a given device already picked (so it can't double count),
//   using an anonymous client id that the frontend generates and stores itself.
// - Data is persisted to a local JSON file, so counts survive server restarts.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

const EMOJIS = ['🔥', '👏', '🚀', '💡', '❤️'];

app.use(cors());
app.use(express.json());

// ---- storage helpers -------------------------------------------------

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      counts: Object.fromEntries(EMOJIS.map((e) => [e, 0])),
      // clientReactions maps clientId -> array of emojis that client has active
      clientReactions: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  // make sure every known emoji exists in counts (in case EMOJIS list changes)
  EMOJIS.forEach((e) => {
    if (!(e in parsed.counts)) parsed.counts[e] = 0;
  });
  return parsed;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---- routes ------------------------------------------------------------

// GET /api/reactions?clientId=xxxx
// Returns the global counts plus which emojis THIS client has already reacted with.
app.get('/api/reactions', (req, res) => {
  const data = loadData();
  const clientId = req.query.clientId || '';
  const mine = data.clientReactions[clientId] || [];
  res.json({ counts: data.counts, mine });
});

// POST /api/reactions/toggle
// body: { clientId: string, emoji: string }
// Toggles that client's reaction for that emoji, adjusting the global count by +/-1.
app.post('/api/reactions/toggle', (req, res) => {
  const { clientId, emoji } = req.body || {};

  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'clientId is required' });
  }
  if (!EMOJIS.includes(emoji)) {
    return res.status(400).json({ error: 'unsupported emoji' });
  }

  const data = loadData();
  const mine = data.clientReactions[clientId] || [];
  const idx = mine.indexOf(emoji);
  let turningOn;

  if (idx === -1) {
    mine.push(emoji);
    data.counts[emoji] = (data.counts[emoji] || 0) + 1;
    turningOn = true;
  } else {
    mine.splice(idx, 1);
    data.counts[emoji] = Math.max(0, (data.counts[emoji] || 0) - 1);
    turningOn = false;
  }

  data.clientReactions[clientId] = mine;
  saveData(data);

  res.json({ counts: data.counts, mine, turningOn });
});

app.get('/', (req, res) => {
  res.send('Portfolio reaction backend is running. Try GET /api/reactions');
});

app.listen(PORT, () => {
  console.log(`Reaction backend listening on http://localhost:${PORT}`);
});
