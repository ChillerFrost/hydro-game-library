// Shared helpers for login.html and index.html
const Hydro = (() => {
  const KEY = 'hydro.user';

  // The signed-in user lives in localStorage ("Keep me signed in") or sessionStorage.
  function getUser() {
    try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY)); } catch { return null; }
  }
  function setUser(user, remember) {
    clearUser();
    const { _id, username, email } = user;
    try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify({ _id, username, email })); } catch {}
  }
  function clearUser() {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch {}
  }

  function errorMessage(data) {
    if (data?.fields?.game) return 'That game is already in your library';
    if (data?.fields) return `That ${Object.keys(data.fields)[0]} is already taken`;
    const msg = data?.error || 'Something went wrong';
    // "User validation failed: email: Path `email` is invalid (x)." -> "email is invalid"
    return msg.replace(/^\w+ validation failed: /, '')
      .split(/,\s(?=\w+: )/)
      .map(part => part.replace(/^\w+: /, '').replace(/Path `(\w+)`/, '$1').replace(/ \(`[^`]*`\)/, '').replace(/\.$/, ''))
      .join('. ');
  }

  async function api(path, method = 'GET', body) {
    const res = await fetch('/api' + path, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = res.status === 204 ? null : await res.json().catch(() => ({ error: 'Unexpected server response' }));
    if (!res.ok) throw Object.assign(new Error(errorMessage(data)), { status: res.status });
    return data;
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Placeholder art: a stable hue per title, rendered with the design's gradients.
  // Titles from the design mock keep their original hues.
  const HUES = {
    'Tidefall': 195, 'Neon Drift': 320, 'Hollow Vale': 265, 'Starforge': 230, 'Rust & Ruin': 25, 'Pixel Pioneers': 95,
    'Cinder Peak': 10, 'Orbital Decay': 210, 'Mossgrove': 140, 'Velocity 9': 50, 'Deep Signal': 185, 'Wardens of Ash': 355,
    'Glassbound': 280, 'Ferrum': 15, 'Lowtide': 190, 'Sunder': 40, 'Kestrel': 205, 'Marrow': 345, 'Autumn Line': 60, 'Null Garden': 120,
  };
  function hue(title) {
    if (title in HUES) return HUES[title];
    let h = 0;
    for (const ch of String(title)) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  }
  const grad = (h, a) => `repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 6px,transparent 6px 14px),linear-gradient(${a}deg,hsl(${h} 52% 36%),hsl(${h + 25} 60% 13%))`;
  const hero = h => `linear-gradient(0deg,#0b0e13 0%,rgba(11,14,19,0) 60%),linear-gradient(90deg,rgba(11,14,19,.55),rgba(11,14,19,0) 55%),repeating-linear-gradient(135deg,rgba(255,255,255,.03) 0 10px,transparent 10px 24px),linear-gradient(165deg,hsl(${h} 50% 34%),hsl(${h + 25} 60% 12%))`;
  // Each takes a game (or a bare title). Real art from Steam is layered over the
  // gradient, so a missing or broken image still shows the placeholder.
  const titleOf = g => (typeof g === 'string' ? g : g.title);
  const img = url => (url ? `url('${url}') center/cover no-repeat,` : '');
  const shade = 'linear-gradient(0deg,#0b0e13 0%,rgba(11,14,19,0) 60%),linear-gradient(90deg,rgba(11,14,19,.55),rgba(11,14,19,0) 55%),';
  const art = {
    cover: g => img(g.cover) + grad(hue(titleOf(g)), 165),
    wide: g => img(g.header) + grad(hue(titleOf(g)), 110),
    hero: g => (g.hero ? shade + img(g.hero) : '') + hero(hue(titleOf(g))),
    shot: url => `url('${url}') center/cover no-repeat,var(--stripes)`,
  };

  return { getUser, setUser, clearUser, api, esc, art };
})();
