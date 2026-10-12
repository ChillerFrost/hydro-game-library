// Ranks games by how closely their title matches a search. Shared by the
// server (routes/games.js) and the browser, so both order results the same way.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HydroSearch = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  // "Marvel’s Spider-Man" -> "marvel s spider man"
  const norm = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  // Edit distance, counting a swap of two neighbouring letters as one typo.
  function distance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  const similarity = (a, b) => (a && b ? 1 - distance(a, b) / Math.max(a.length, b.length) : 0);

  // Higher is closer; 0 means no match.
  function score(game, query) {
    const q = norm(query);
    if (!q) return 0;
    const t = norm(game.title), words = t.split(' '), qWords = q.split(' ');
    const initials = words.map(w => w[0]).join('');

    if (t === q) return 1000;
    if (t.startsWith(q)) return 900 - (t.length - q.length) / 100; // shorter titles first
    if (words.some(w => w.startsWith(q))) return 800;
    if (q.length >= 2 && !q.includes(' ') && initials.startsWith(q)) return 750; // "gta", "rdr"
    const at = t.indexOf(q);
    if (at >= 0) return 700 - at;
    if (qWords.every(qw => words.some(w => w.startsWith(qw)))) return 650; // "souls dark"

    // A developer name ("valve", "capcom") beats a near-miss title.
    if (norm(game.developer).split(' ').some(w => w.startsWith(q))) return 610;

    // Typos: the query against the start of the title, and word by word.
    const prefixSim = similarity(q, t.slice(0, q.length));
    const wordSim = qWords.reduce((sum, qw) => sum + Math.max(...words.map(w => Math.max(similarity(qw, w), similarity(qw, w.slice(0, qw.length))))), 0) / qWords.length;
    const best = Math.max(prefixSim, wordSim);
    if (best >= (q.length < 4 ? 0.75 : 0.7)) return 400 + 200 * best;

    if (norm(game.developer).includes(q) || norm(game.genre).startsWith(q)) return 300;
    return 0;
  }

  // Matching games, closest first (ties alphabetical).
  function search(games, query, limit = Infinity) {
    return games.map(g => ({ g, s: score(g, query) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || a.g.title.localeCompare(b.g.title))
      .slice(0, limit)
      .map(x => x.g);
  }

  return { norm, score, search };
});
