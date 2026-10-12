// Looks up every catalogue game on the Steam store and writes data/media.json
// (cover art, banner, hero, screenshots, trailer, short description).
// Run after changing data/games.js:  node scripts/fetch-media.js
// Only games missing from media.json are fetched; pass --all to refresh every game.
const fs = require('fs');
const path = require('path');
const games = require('../data/games');

// Titles whose Steam search result isn't the right game. null = not on Steam.
const APP_IDS = {
  'Minecraft': null,
  'StarCraft II: Wings of Liberty': null,
  'The Witcher 3: Wild Hunt': 292030,
  'Death Stranding': 1850570, // Director's Cut
  'Overwatch 2': 2357570,
  'Rocket League': 252950,
  'Football Manager 2024': 2252570,
  'Northgard': 466560,
  'The Elder Scrolls V: Skyrim': 489830, // Special Edition (original is delisted)
  "Uncharted 4: A Thief's End": 1659420, // Legacy of Thieves Collection
  'DOOM': 379720,
  'Resident Evil 4': 2050650,
  'Dead Space': 1693980,
  'Microsoft Flight Simulator': 1250410,
  'Cities: Skylines': 255710,
  'Life is Strange': 319630,
  'Portal': 400,
  'Half-Life 2': 220,
  'Journey': 638230,
  'Rust': 252490,
  'Inside': 304430,
  'Limbo': 48000,
};

const OUT = path.join(__dirname, '..', 'data', 'media.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => s.toLowerCase().replace(/[®™©]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const CDN = id => `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}`;

async function getJSON(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 429) { await sleep(30000); continue; } // rate limited
    throw new Error(`${res.status} ${url}`);
  }
  throw new Error(`gave up on ${url}`);
}
const exists = async url => (await fetch(url, { method: 'HEAD' })).ok;

async function findAppId(title) {
  if (title in APP_IDS) return APP_IDS[title];
  const { items = [] } = await getJSON(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`);
  const t = norm(title);
  const hit = items.find(i => norm(i.name) === t)
    || items.find(i => norm(i.name).startsWith(t) && !/soundtrack|dlc|pack|bundle|season pass/i.test(i.name));
  return hit ? hit.id : null;
}

(async () => {
  const refreshAll = process.argv.includes('--all');
  const old = !refreshAll && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const media = {};
  for (const { title } of games) {
    if (old[title]) { media[title] = old[title]; continue; } // already fetched
    const id = await findAppId(title);
    if (!id) { console.log(`--  ${title}: not found on Steam`); continue; }
    const res = await getJSON(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english`);
    const d = res[id]?.success && res[id].data;
    if (!d) { console.log(`!!  ${title}: no details for app ${id}`); continue; }

    const movie = (d.movies || []).find(m => m.highlight && m.hls_h264) || (d.movies || []).find(m => m.hls_h264);
    const [cover, hero] = await Promise.all([`${CDN(id)}/library_600x900.jpg`, `${CDN(id)}/library_hero.jpg`].map(u => exists(u).then(ok => ok && u)));
    media[title] = {
      steamAppId: id,
      steamName: d.name,
      description: (d.short_description || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]+>/g, '').trim(),
      cover: cover || undefined,
      hero: hero || undefined,
      header: d.header_image?.split('?')[0],
      screenshots: (d.screenshots || []).slice(0, 6).map(s => ({ thumb: s.path_thumbnail.split('?')[0], full: s.path_full.split('?')[0] })),
      trailer: movie ? { name: movie.name, hls: movie.hls_h264, thumbnail: movie.thumbnail } : undefined,
    };
    console.log(`ok  ${title} -> ${d.name} (${id})${cover ? '' : ' [no cover]'}${movie ? '' : ' [no trailer]'}`);
    await sleep(1500); // stay well under Steam's rate limit
  }
  fs.writeFileSync(OUT, JSON.stringify(media, null, 2) + '\n');
  console.log(`\nWrote ${Object.keys(media).length}/${games.length} games to ${path.relative(process.cwd(), OUT)}`);
})().catch(e => { console.error(e); process.exit(1); });
