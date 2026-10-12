(() => {
  const { api, esc, art } = Hydro;
  const user = Hydro.getUser();
  if (!user) { location.replace('/login.html'); return; }

  const $ = id => document.getElementById(id);

  // ---------- preferences (per browser) ----------
  const PREF_KEY = 'hydro.prefs';
  const prefs = Object.assign({ view: 'split', showUninstalled: true, confirmRemove: true }, readPrefs());
  function readPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; } }
  function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {} }

  // ---------- state ----------
  const S = {
    games: [], entries: [], loaded: false, error: null,
    selectedId: null, filter: 'all', genre: null, query: '', sort: 'recent', shelf: 'all',
    menu: null, modal: null, dialog: null,
  };

  // ---------- formatting ----------
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const hours = e => +(e.hoursPlayed || 0).toFixed(1);
  const playtime = e => `${hours(e)} h`;
  const status = e => (e.installed ? `Installed · ${playtime(e)}` : 'Not installed');
  const date = d => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  function ago(d) {
    const min = (Date.now() - new Date(d)) / 60000;
    if (min < 1) return 'just now';
    if (min < 60) return `${Math.floor(min)} min ago`;
    if (min < 1440) return `${Math.floor(min / 60)} h ago`;
    const days = Math.floor(min / 1440);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 14) return 'last week';
    if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
    return date(d);
  }
  // updatedAt moves on every library change; playing (+1 h) is the main one.
  const lastPlayed = e => (e.hoursPlayed > 0 ? cap(ago(e.updatedAt)) : 'Never');
  const countText = list => `${plural(list.length, 'game')} · ${list.filter(e => e.installed).length} installed`;
  const genres = games => [...new Set(games.map(g => g.genre))].sort((a, b) => a.localeCompare(b));
  const about = g => `${g.title} is ${/^[aeiou]/i.test(g.genre) ? 'an' : 'a'} ${g.genre} game from ${g.developer}${g.releaseYear ? `, released in ${g.releaseYear}` : ''}.`;
  const byTitle = (a, b) => (a.game || a).title.localeCompare((b.game || b).title);

  // ---------- data helpers ----------
  const gameById = id => S.games.find(g => g._id === id);
  const ownedMap = () => new Map(S.entries.map(e => [e.game._id, e]));
  function entry(id) {
    const e = S.entries.find(x => x._id === id);
    if (!e) throw Object.assign(new Error('That game is no longer in your library'), { status: 404 });
    return e;
  }
  const libraryItems = () => (prefs.showUninstalled ? S.entries : S.entries.filter(e => e.installed));
  const SORTS = {
    recent: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    title: byTitle,
    playtime: (a, b) => b.hoursPlayed - a.hoursPlayed,
    added: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  };
  function filtered(sort = S.sort) {
    let items = libraryItems();
    if (S.filter === 'installed') items = items.filter(e => e.installed);
    if (S.filter === 'favorites') items = items.filter(e => e.favorite);
    if (S.genre) items = items.filter(e => e.game.genre === S.genre);
    const q = S.query.trim().toLowerCase();
    if (q) items = items.filter(e => e.game.title.toLowerCase().includes(q) || e.game.genre.toLowerCase().includes(q));
    return [...items].sort(SORTS[sort] || SORTS.recent);
  }

  async function patch(e, body) {
    const updated = await api('/library/' + e._id, 'PATCH', body);
    S.entries = S.entries.map(x => (x._id === updated._id ? updated : x));
    return updated;
  }

  // Runs a mutation, reports failures, then re-renders.
  async function run(fn) {
    try { await fn(); } catch (err) {
      toast(err.message, true);
      if (err.status === 404) await load();
    }
    render();
  }

  // ---------- small templates ----------
  const tagChips = (g, cls = '') => `<span class="chip ${cls}">${esc(g.genre)}</span>`;
  const stat = (label, val) => `<div class="stat"><div class="label">${label}</div><div class="stat-val">${esc(val)}</div></div>`;
  const playBtn = (e, cls = 'btn btn-primary', tri = 'play-tri sm') =>
    `<button class="${cls}" data-act="play" data-id="${e._id}"><div class="${tri}"></div>${e.installed ? 'Play' : 'Install'}</button>`;
  const noMatch = text => `<div class="mini-sub" style="padding:8px">${text}</div>`;

  function topbar(active, r) {
    const q = r.name === 'store' && r.arg === 'browse' ? r.params.get('q') || '' : '';
    const tabs = [['store', 'Store'], ['library', 'Library'], ['downloads', 'Downloads']];
    return `<header class="topbar">
      <a class="brand" href="#/library"><div class="logo-mark"></div><div class="brand-name">Hydro</div></a>
      <nav class="nav" aria-label="Main">${tabs.map(([k, l]) => `<a href="#/${k}"${active === k ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
      <div class="spacer"></div>
      <form class="search" data-submit="search" role="search"><span class="search-icon"></span><input id="top-search" name="q" value="${esc(q)}" placeholder="${active === 'store' ? 'Search the store' : 'Search'}" aria-label="Search the store"></form>
      <a class="me${active === 'settings' ? ' on' : ''}" href="#/settings/account" title="Account settings"><div class="avatar"></div><div class="me-name">${esc(user.username)}</div></a>
    </header>`;
  }

  // ---------- library ----------
  function filterChips(withCounts) {
    const all = libraryItems();
    const n = { all: all.length, installed: all.filter(e => e.installed).length, favorites: all.filter(e => e.favorite).length };
    return [['all', 'All'], ['installed', 'Installed'], ['favorites', 'Favorites']].map(([k, l]) =>
      `<button class="chip${withCounts ? ' lg' : ''}${S.filter === k ? ' on' : ''}" data-act="filter" data-v="${k}" aria-pressed="${S.filter === k}">${l}${withCounts ? ` · ${n[k]}` : ''}</button>`).join('');
  }

  function emptyLibrary() {
    return `<div class="page" style="display:flex"><div class="empty">
      <div class="logo-mark" style="width:30px;height:30px;margin-bottom:6px"></div>
      <div class="empty-title">Your library is empty</div>
      <div class="empty-sub">Add games from the Hydro store and they'll show up here, ready to install and play.</div>
      <a class="btn btn-primary big" href="#/store">Browse the store</a>
    </div></div>`;
  }

  // 1a — split view
  function splitView() {
    const items = filtered('title');
    const sel = items.find(e => e._id === S.selectedId) || items[0];
    const row = e => `<button class="row${e.installed ? ' inst' : ''}${sel && e._id === sel._id ? ' sel' : ''}" data-act="select" data-id="${e._id}"${sel && e._id === sel._id ? ' aria-current="true"' : ''}>
        <div class="row-cover" style="background:${art.cover(e.game.title)}"></div><div class="row-name">${esc(e.game.title)}</div><div class="dot${e.installed ? ' on' : ''}"></div></button>`;
    const favs = items.filter(e => e.favorite);
    return `<aside class="side">
      <div class="side-top">
        <label class="search"><span class="search-icon"></span><input id="lib-search" data-in="query" value="${esc(S.query)}" placeholder="Search library" aria-label="Search library"></label>
        <div class="side-chips">${filterChips(false)}</div>
      </div>
      <div class="side-list" data-keep-scroll="side">
        ${favs.length ? `<div class="label">Favorites</div>${favs.map(row).join('')}` : ''}
        <div class="label">All games · ${items.length}</div>
        ${items.map(row).join('') || noMatch('No games match.')}
      </div>
      <div class="side-foot"><div>${countText(libraryItems())}</div><a class="link" href="#/settings/library">Manage</a></div>
    </aside>
    <section class="detail" data-keep-scroll="detail">${sel ? entryDetail(sel) : `<div class="empty" style="height:100%"><div class="empty-sub">No games match these filters.</div></div>`}</section>`;
  }

  function entryDetail(e) {
    const g = e.game;
    const sameGenre = S.entries.filter(x => x.game.genre === g.genre).length;
    const favCount = S.entries.filter(x => x.favorite).length;
    const menuOpen = S.menu === e._id;
    return `<div class="hero" style="background:${art.hero(g.title)}"><div class="hero-text"><div class="hero-studio">${esc(g.developer)}</div><div class="hero-name">${esc(g.title)}</div></div></div>
    <div class="actions">
      ${playBtn(e, 'btn btn-primary big', 'play-tri')}
      ${e.installed ? `<button class="btn btn-ghost" data-act="uninstall" data-id="${e._id}">Uninstall</button>` : ''}
      <button class="btn btn-ghost${e.favorite ? ' on' : ''}" data-act="fav" data-id="${e._id}" aria-pressed="${e.favorite}">${e.favorite ? 'Favorited' : 'Favorite'}</button>
      <div class="menu-wrap">
        <button class="btn btn-ghost btn-icon" data-act="menu" data-id="${e._id}" aria-label="More options" aria-haspopup="menu" aria-expanded="${menuOpen}">···</button>
        ${menuOpen ? `<div class="menu" role="menu"><button role="menuitem" data-act="open" data-id="${g._id}">View store page</button><button role="menuitem" class="danger" data-act="remove" data-id="${e._id}">Remove from library</button></div>` : ''}
      </div>
      <div class="spacer"></div>
      <div class="stats">${stat('Last played', lastPlayed(e))}${stat('Playtime', playtime(e))}${stat('Status', e.installed ? 'Installed' : 'Not installed')}</div>
    </div>
    <div class="detail-body">
      <div class="stack">
        <div class="group"><div class="label">About</div><p class="prose">${esc(about(g))}</p></div>
        <div class="group"><div class="label">Tags</div><div class="tags">${tagChips(g)}</div></div>
        <div class="group"><div class="label">Screenshots</div><div class="shots"><div class="shot">screenshot 1</div><div class="shot">screenshot 2</div><div class="shot">screenshot 3</div></div></div>
      </div>
      <div class="stack">
        <div class="group"><div class="label">In collections</div><div class="box">
          ${e.favorite ? `<div class="box-row"><div>Favorites</div><div class="muted">${plural(favCount, 'game')}</div></div>` : ''}
          <div class="box-row"><div>${esc(g.genre)}</div><div class="muted">${plural(sameGenre, 'game')}</div></div>
        </div></div>
        <div class="group"><div class="label">Details</div><div class="kv">
          <div>Developer</div><div>${esc(g.developer)}</div>
          <div>Released</div><div>${g.releaseYear ?? '—'}</div>
          <div>Added</div><div>${date(e.createdAt)}</div>
        </div></div>
      </div>
    </div>`;
  }

  // 1b — cover grid
  function gridView() {
    const items = filtered();
    const all = libraryItems();
    const gs = genres(all.map(e => e.game));
    const sorts = [['recent', 'Recently played'], ['title', 'Title'], ['playtime', 'Playtime'], ['added', 'Recently added']];
    return `<div class="page" data-keep-scroll="grid"><div class="pad" style="gap:18px">
      <div class="lib-head">
        <div class="lib-title">Library</div><div class="lib-count">${countText(all)}</div>
        <div class="spacer"></div>
        <label class="search"><span class="search-icon"></span><input id="lib-search" data-in="query" value="${esc(S.query)}" placeholder="Search by title or tag" aria-label="Search library"></label>
        <label class="select"><span>Sort</span><select data-change="sort" aria-label="Sort library">${sorts.map(([v, l]) => `<option value="${v}"${S.sort === v ? ' selected' : ''}>${l}</option>`).join('')}</select><div class="caret"></div></label>
        <div class="viewtoggle" role="group" aria-label="Layout">
          <button class="on" aria-pressed="true" aria-label="Cover grid"><div class="vt-grid"><i></i><i></i><i></i><i></i></div></button>
          <button data-act="view" data-v="split" aria-pressed="false" aria-label="List view"><div class="vt-list"><i></i><i></i><i></i></div></button>
        </div>
      </div>
      <div class="chips">
        ${filterChips(true)}
        ${gs.length ? '<div class="vsep"></div>' : ''}
        ${gs.map(gn => `<button class="chip lg${S.genre === gn ? ' on' : ''}" data-act="genre" data-v="${esc(gn)}" aria-pressed="${S.genre === gn}">${esc(gn)}</button>`).join('')}
        <a class="chip lg" href="#/store" style="background:none;border:1px dashed rgba(255,255,255,.18);color:var(--muted)">+ Add games</a>
      </div>
      <div class="cgrid">${items.map(gridCard).join('') || noMatch('No games match these filters.')}</div>
    </div></div>`;
  }

  function gridCard(e) {
    const g = e.game;
    return `<div class="card${e.installed ? '' : ' dim'}">
      <div class="cover" style="background:${art.cover(g.title)}">
        <div class="cover-name">${esc(g.title)}</div>
        <div class="card-over" data-act="open" data-id="${g._id}" style="cursor:pointer">${playBtn(e)}</div>
        ${e.installed ? '<div class="inst-dot"></div>' : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:2px"><a class="card-name" href="#/game/${g._id}">${esc(g.title)}</a><div class="card-sub${e.installed ? ' inst' : ''}">${status(e)}</div></div>
    </div>`;
  }

  // 1c — shelves
  function shelvesView() {
    const all = libraryItems();
    const inst = all.filter(e => e.installed), favs = all.filter(e => e.favorite), played = all.filter(e => e.hoursPlayed > 0);
    const gs = genres(all.map(e => e.game));
    const inGenre = gn => all.filter(e => e.game.genre === gn).sort(byTitle);
    const item = (key, label, n) => `<button class="rail-item${S.shelf === key ? ' on' : ''}" data-act="shelf" data-v="${esc(key)}"><span>${label}</span><span>${n}</span></button>`;
    const rail = `<nav class="rail" aria-label="Library sections">
      ${item('all', 'All games', all.length)}${item('installed', 'Installed', inst.length)}${item('favorites', 'Favorites', favs.length)}${item('recent', 'Recently played', played.length)}
      ${gs.length ? '<div class="label">Genres</div>' : ''}${gs.map(gn => item('genre:' + gn, esc(gn), inGenre(gn).length)).join('')}
      <a class="rail-add" href="#/store">+ Add games</a>
    </nav>`;

    const head = (title, sub, link) => `<div class="section-head"><div class="section-title">${title}</div><div class="section-sub">${sub}</div>${link ? `<div class="spacer"></div>${link}` : ''}</div>`;
    const seeAll = key => `<button class="section-link" data-act="shelf" data-v="${esc(key)}">See all</button>`;
    const strip = (list, addGenre) => `<div class="strip">${list.map(miniCard).join('')}${addGenre ? `<a class="mini-add" href="#/store/browse?genre=${encodeURIComponent(addGenre)}">+ Add game</a>` : ''}</div>`;

    let body;
    if (S.shelf === 'all') {
      const recent = [...(played.length ? played : all)].sort(SORTS.recent).slice(0, 3);
      body = `
        <div class="shelf">${head('Continue playing', played.length ? 'Most recent' : 'Pick something to start')}<div class="wide3">${recent.map(wideCard).join('')}</div></div>
        ${inst.length ? `<div class="shelf">${head('Installed', plural(inst.length, 'game'), seeAll('installed'))}${strip([...inst].sort(byTitle))}</div>` : ''}
        ${favs.length ? `<div class="shelf">${head('Favorites', plural(favs.length, 'game'), seeAll('favorites'))}${strip([...favs].sort(byTitle))}</div>` : ''}
        ${gs.map(gn => `<div class="shelf">${head(esc(gn), `Genre · ${plural(inGenre(gn).length, 'game')}`, seeAll('genre:' + gn))}${strip(inGenre(gn), gn)}</div>`).join('')}`;
    } else {
      const [kind, gn] = S.shelf.split(/:(.*)/);
      const lists = { installed: inst, favorites: favs, recent: [...played].sort(SORTS.recent), genre: gn ? inGenre(gn) : [] };
      const titles = { installed: 'Installed', favorites: 'Favorites', recent: 'Recently played', genre: esc(gn || '') };
      const list = lists[kind] || [];
      body = `<div class="shelf">${head(titles[kind], plural(list.length, 'game'), `<button class="section-link" data-act="shelf" data-v="all">Back to shelves</button>`)}
        <div class="strip" style="flex-wrap:wrap;row-gap:22px">${list.map(miniCard).join('') || noMatch('Nothing here yet.')}</div></div>`;
    }
    return rail + `<div class="shelves" data-keep-scroll="shelves">${body}</div>`;
  }

  function wideCard(e) {
    const g = e.game;
    return `<div class="wcard">
      <div class="wcard-art" style="background:${art.wide(g.title)}"><div class="cover-name">${esc(g.title)}</div>${playBtn(e)}</div>
      <div class="wcard-foot"><div style="display:flex;flex-direction:column;gap:2px;min-width:0"><a class="wcard-name" href="#/game/${g._id}">${esc(g.title)}</a><div class="wcard-sub">${e.hoursPlayed > 0 ? `Last played ${ago(e.updatedAt)}` : 'Not played yet'}</div></div><div class="mono-sm">${playtime(e)}</div></div>
    </div>`;
  }

  function miniCard(e) {
    const g = e.game;
    return `<a class="mini${e.installed ? '' : ' dim'}" href="#/game/${g._id}"><div class="cover" style="background:${art.cover(g.title)}"><div class="cover-name">${esc(g.title)}</div></div><div class="mini-sub">${e.installed ? `${playtime(e)} played` : 'Not installed'}</div></a>`;
  }

  // ---------- store ----------
  function storeNav(active) {
    const tabs = [['featured', 'Featured', '#/store'], ['new', 'New releases', '#/store/browse?sort=new'], ['all', 'All games', '#/store/browse']];
    return `<nav class="subnav" aria-label="Store sections">${tabs.map(([k, l, h]) => `<a href="${h}"${active === k ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('')}
      <div class="spacer"></div><a href="#/library">In your library · ${S.entries.length}</a></nav>`;
  }

  function emptyCatalogue() {
    return `<div class="empty"><div class="empty-title">The store is empty</div><div class="empty-sub">No games are available right now. Check back soon.</div></div>`;
  }

  function getButton(g, own, cls = 'btn sm btn-primary') {
    const e = own.get(g._id);
    return e ? `<button class="${cls}" data-act="golib" data-id="${e._id}">Open in library</button>`
      : `<button class="${cls}" data-act="add" data-id="${g._id}">Add to library</button>`;
  }

  function storeHome() {
    if (!S.games.length) return `<div class="col">${storeNav('featured')}${emptyCatalogue()}</div>`;
    const own = ownedMap();
    const newest = [...S.games].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || byTitle(a, b));
    const f = newest.find(g => !own.has(g._id)) || newest[0];
    const recent = newest.filter(g => g._id !== f._id).slice(0, 4);
    return `<div class="col" data-keep-scroll="store">${storeNav('featured')}<div class="pad" style="padding-top:22px">
      <div class="feature">
        <a class="feature-art" href="#/game/${f._id}" style="background:${art.hero(f.title)}"><div class="feature-kicker">Featured</div><div class="hero-text"><div class="hero-studio">${esc(f.developer)}</div><div class="hero-name">${esc(f.title)}</div></div></a>
        <div class="feature-side">
          <div class="shots4"><div class="shot">screenshot</div><div class="shot">screenshot</div><div class="shot">screenshot</div><div class="shot">screenshot</div></div>
          <p class="prose-sm">${esc(about(f))}</p>
          <div class="tags">${tagChips(f, 'tag')}</div>
          <div class="spacer"></div>
          <div class="buy"><div class="price">Free</div>${getButton(f, own)}<a class="btn sm btn-ghost" href="#/game/${f._id}" style="padding:0 14px;font-size:13px">View details</a></div>
        </div>
      </div>
      ${recent.length ? `<div class="shelf">
        <div class="section-head"><div class="section-title">New releases</div><div class="section-sub">The latest games in the store</div><div class="spacer"></div><a class="section-link" href="#/store/browse?sort=new">See all</a></div>
        <div class="grid4">${recent.map(g => offerCard(g, own)).join('')}</div>
      </div>` : ''}
      <div class="shelf"><div class="section-title">Browse by tag</div>
        <div class="chips">${genres(S.games).map(gn => `<a class="tagbtn" href="#/store/browse?genre=${encodeURIComponent(gn)}">${esc(gn)}</a>`).join('')}<a class="tagbtn" href="#/store/browse" style="background:none;border-color:transparent;color:var(--accent)">All games →</a></div>
      </div>
    </div></div>`;
  }

  function offerCard(g, own) {
    return `<a class="ocard" href="#/game/${g._id}">
      <div class="ocard-art" style="background:${art.wide(g.title)}">${own.has(g._id) ? '<div class="badge owned">OWNED</div>' : ''}<div class="cover-name">${esc(g.title)}</div></div>
      <div class="ocard-foot"><div style="min-width:0"><div class="ocard-name">${esc(g.title)}</div><div class="ocard-sub">${esc(g.genre)} · ${esc(g.developer)}</div></div><div class="ocard-price">${own.has(g._id) ? 'In library' : 'Free'}</div></div>
    </a>`;
  }

  function browsePage(p) {
    const q = (p.get('q') || '').trim(), genre = p.get('genre'), newest = p.get('sort') === 'new';
    const own = ownedMap();
    let list = S.games.filter(g => (!genre || g.genre === genre) && (!q || g.title.toLowerCase().includes(q.toLowerCase())));
    list = newest
      ? [...list].sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0) || byTitle(a, b))
      : [...list].sort(byTitle);
    const title = q ? `Results for “${esc(q)}”` : genre ? esc(genre) : newest ? 'New releases' : 'All games';
    const tab = q || genre ? null : newest ? 'new' : 'all';
    const chipHref = gn => '#/store/browse?' + new URLSearchParams({ ...(q && { q }), ...(newest && { sort: 'new' }), ...(genre !== gn && { genre: gn }) });
    return `<div class="col" data-keep-scroll="browse">${storeNav(tab)}<div class="pad" style="gap:16px">
      <div class="section-head"><div class="section-title">${title}</div><div class="section-sub">${plural(list.length, 'game')}</div>${q || genre ? '<div class="spacer"></div><a class="section-link" href="#/store/browse">Clear</a>' : ''}</div>
      ${S.games.length ? `<div class="chips">${genres(S.games).map(gn => `<a class="chip lg${genre === gn ? ' on' : ''}" href="${chipHref(gn)}">${esc(gn)}</a>`).join('')}</div>` : ''}
      ${list.length ? `<div class="grid8">${list.map(g => `<a class="scard" href="#/game/${g._id}">
          <div class="cover" style="background:${art.cover(g.title)}"><div class="cover-name">${esc(g.title)}</div>${own.has(g._id) ? '<div class="inst-dot"></div>' : ''}</div>
          <div class="scard-foot"><div>${esc(g.genre)}${g.releaseYear ? ` · ${g.releaseYear}` : ''}</div><div>${own.has(g._id) ? 'Owned' : 'Free'}</div></div>
        </a>`).join('')}</div>`
        : S.games.length ? noMatch('No games match. Try another search or tag.') : emptyCatalogue()}
    </div></div>`;
  }

  // 1e — game page
  function gamePage(r) {
    const g = gameById(r.arg);
    if (!g) return `<div class="col">${storeNav(null)}<div class="empty"><div class="empty-title">Game not found</div><div class="empty-sub">It may have been removed from the store.</div><a class="btn btn-primary big" href="#/store">Back to store</a></div></div>`;
    const e = ownedMap().get(g._id);
    const t = esc(g.title);
    return `<div class="col" data-keep-scroll="game">${storeNav(null)}<div class="gpage">
      <div class="crumbs"><a href="#/store">Store</a><span>›</span><a href="#/store/browse?genre=${encodeURIComponent(g.genre)}">${esc(g.genre)}</a><span>›</span><span>${t}</span></div>
      <div class="gtitle-row">
        <div style="display:flex;flex-direction:column;gap:6px"><div class="gtitle">${t}</div><div class="gsub">${esc(g.developer)}${g.releaseYear ? ` · Released ${g.releaseYear}` : ''}</div></div>
        ${e ? `<button class="btn xs btn-ghost" style="height:38px" data-act="golib" data-id="${e._id}">View in library</button>` : ''}
      </div>
      <div class="ggrid">
        <div class="group">
          <div class="trailer"><div style="display:flex;flex-direction:column;align-items:center;gap:12px"><div class="trailer-play"><div></div></div><div style="font:11px var(--mono);color:var(--dim)">trailer</div></div></div>
          <div class="thumbs"><div></div><div></div><div></div><div></div><div></div></div>
        </div>
        <div class="stack" style="gap:14px">
          <div class="gart cover" style="background:${art.wide(g.title)}"><div class="cover-name">${t}</div></div>
          <p class="prose-sm">${esc(about(g))}</p>
          <div class="kv plain"><div>Developer</div><div>${esc(g.developer)}</div><div>Genre</div><div>${esc(g.genre)}</div><div>Released</div><div>${g.releaseYear ?? '—'}</div></div>
          <div class="tags">${tagChips(g, 'tag')}</div>
          <div class="buybox">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div style="font-size:14px;font-weight:600">${e ? 'In your library' : `Get ${t}`}</div>${e ? '' : '<div class="price" style="margin:0">Free</div>'}</div>
            ${e ? playBtn(e) : `<button class="btn btn-primary" data-act="add" data-id="${g._id}">Add to library</button>`}
            <div class="fine">${e ? `${status(e)} · ${e.favorite ? 'In Favorites' : 'Not in Favorites'}` : 'Instant access · Install on any device'}</div>
          </div>
        </div>
      </div>
      <div class="group" style="max-width:960px"><div class="section-title">About this game</div><p class="prose" style="font-size:14px;max-width:none">${esc(about(g))}</p></div>
    </div></div>`;
  }

  // ---------- downloads ----------
  function downloadsPage() {
    const inst = S.entries.filter(e => e.installed).sort(byTitle);
    return `<div class="page" data-keep-scroll="downloads"><div class="pad">
      <div class="lib-head"><div class="lib-title">Downloads</div><div class="lib-count">Nothing downloading right now</div></div>
      <div class="shelf">
        <div class="section-head"><div class="section-title">Installed</div><div class="section-sub">${plural(inst.length, 'game')}</div></div>
        <div class="panel">${inst.map(e => `<div class="prow">
            <div class="row-cover" style="background:${art.cover(e.game.title)}"></div>
            <div class="prow-text"><a class="prow-title" href="#/game/${e.game._id}">${esc(e.game.title)}</a><div class="prow-sub">${esc(e.game.genre)} · ${playtime(e)} played</div></div>
            ${playBtn(e, 'btn xs btn-primary')}
            <button class="btn xs btn-ghost" data-act="uninstall" data-id="${e._id}">Uninstall</button>
          </div>`).join('') || '<div class="prow"><div class="prow-sub">No games installed. Install one from your library.</div></div>'}</div>
      </div>
    </div></div>`;
  }

  // ---------- settings (1g) ----------
  const sHead = (title, sub) => `<div class="group" style="gap:6px"><div class="stitle">${title}</div><div class="ssub">${sub}</div></div>`;
  const toggleRow = (k, title, sub) => `<button class="prow" data-act="pref" data-k="${k}" role="switch" aria-checked="${prefs[k]}"><div class="prow-text"><div class="prow-title">${title}</div><div class="prow-sub">${sub}</div></div><div class="toggle${prefs[k] ? ' on' : ''}"></div></button>`;
  const meter = (left, right, pct, cls = '') => `<div class="meter"><div class="meter-head"><div>${left}</div><div>${right}</div></div><div class="meter-bar ${cls}"><div style="width:${pct}%"></div></div></div>`;
  const viewCard = (v, label, thumb) => `<button class="vcard${prefs.view === v ? ' on' : ''}" data-act="view" data-v="${v}" role="radio" aria-checked="${prefs.view === v}">${thumb}<div class="vcard-foot"><div>${label}</div><div class="radio"></div></div></button>`;

  const SETTINGS = {
    account: () => `${sHead('Account', `Signed in as ${esc(user.email)}`)}
      <div class="panel">
        <div class="prow"><div class="prow-text"><div class="prow-title">Username</div><div class="prow-sub">${esc(user.username)}</div></div></div>
        <div class="prow"><div class="prow-text"><div class="prow-title">Email</div><div class="prow-sub">${esc(user.email)}</div></div></div>
        <div class="prow"><div class="prow-text"><div class="prow-title">Sign out</div><div class="prow-sub">Sign out of Hydro in this browser.</div></div><button class="btn xs btn-ghost" data-act="signout">Sign out</button></div>
      </div>
      <div class="panel"><div class="prow"><div class="prow-text"><div class="prow-title">Delete account</div><div class="prow-sub">Permanently removes your account and your library.</div></div><button class="btn xs btn-ghost danger" data-act="delete-account">Delete account</button></div></div>`,

    library: () => {
      const n = S.entries.length, inst = S.entries.filter(e => e.installed).length, fav = S.entries.filter(e => e.favorite).length;
      const pct = x => (n ? Math.round((x / n) * 100) : 0);
      return `${sHead('Library', 'How Hydro organizes and shows your games.')}
      <div class="panel">
        ${toggleRow('showUninstalled', 'Show games that aren’t installed', 'Include uninstalled games in your library lists.')}
        ${toggleRow('confirmRemove', 'Ask before removing a game', 'Confirm before a game is taken out of your library.')}
      </div>
      <div class="group" style="gap:12px">
        <div class="group" style="gap:3px"><div class="prow-title">Default library view</div><div class="prow-sub">Pick how the Library tab opens.</div></div>
        <div class="vgrid" role="radiogroup" aria-label="Default library view">
          ${viewCard('split', 'Split view', '<div class="vthumb" style="display:flex"><i class="b" style="width:22px"></i><i style="flex:1"></i></div>')}
          ${viewCard('grid', 'Cover grid', `<div class="vthumb" style="display:grid;grid-template-columns:repeat(5,1fr)">${'<i class="b"></i>'.repeat(5)}</div>`)}
          ${viewCard('shelves', 'Shelves', '<div class="vthumb" style="display:flex;flex-direction:column"><i class="b" style="flex:1"></i><i style="flex:1"></i><i style="flex:1"></i></div>')}
        </div>
      </div>
      <div class="group" style="gap:12px">
        <div class="prow-title">Summary</div>
        <div class="panel" style="padding:16px 20px;gap:14px">
          ${meter(`Installed · ${plural(inst, 'game')}`, `${inst} of ${n}`, pct(inst))}
          ${meter(`Favorites · ${plural(fav, 'game')}`, `${fav} of ${n}`, pct(fav), 'gold')}
        </div>
      </div>`;
    },

  };

  function settingsPage(r) {
    const sec = SETTINGS[r.arg] ? r.arg : 'account';
    const items = [['account', 'Account'], ['library', 'Library']];
    return `<nav class="snav" aria-label="Settings">
        <div class="snav-title">Settings</div>
        ${items.map(([k, l]) => `<a href="#/settings/${k}"${sec === k ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('')}
        <div class="spacer"></div><div class="snav-foot">Hydro 1.0.0</div>
      </nav>
      <div class="page" data-keep-scroll="settings"><div class="spage">${SETTINGS[sec]()}</div></div>`;
  }

  // ---------- overlays ----------
  // 1f — added-to-library confirmation
  function addModal() {
    const m = S.modal, g = gameById(m.gameId);
    if (!g) return '';
    return `<div class="overlay" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <div class="modal-head">
        <div class="modal-cover" style="background:${art.cover(g.title)}"></div>
        <div style="display:flex;flex-direction:column;gap:3px"><div class="kicker">Added to your library</div><div class="modal-title" id="m-title">${esc(g.title)}</div><div class="modal-sub">${esc(g.developer)} · ${esc(g.genre)}</div></div>
        <button class="modal-x" data-act="modal-skip" aria-label="Close">×</button>
      </div>
      <div class="modal-body">
        <div class="group" style="gap:10px"><div class="label">Install</div>
          <button class="opt" data-act="modal-install" role="switch" aria-checked="${m.install}"><div class="toggle${m.install ? ' on' : ''}"></div><div class="opt-text"><div class="opt-title">Install now</div><div class="opt-sub">${m.install ? 'Ready to play as soon as you open your library' : 'You can install it later from your library'}</div></div></button>
        </div>
        <div class="group" style="gap:10px"><div class="label">Add to collection <span style="color:#3e4856;text-transform:none;letter-spacing:0">· optional</span></div>
          <div class="chips"><button class="chip pick${m.fav ? ' on' : ''}" data-act="modal-fav" aria-pressed="${m.fav}">Favorites</button></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="link" data-act="modal-view">View in library →</button>
        <button class="btn sm btn-ghost" data-act="modal-skip">Not now</button>
        <button class="btn sm btn-primary" data-act="modal-confirm">${m.install ? 'Install &amp; open library' : 'Open library'}</button>
      </div>
    </div></div>`;
  }

  function confirmDialog() {
    const d = S.dialog;
    return `<div class="overlay" data-act="dialog-bg"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="d-title" style="width:440px">
      <div class="modal-head"><div class="modal-title" id="d-title">${d.title}</div><button class="modal-x" data-act="dialog-cancel" aria-label="Close">×</button></div>
      <div class="modal-body"><p>${d.body}</p></div>
      <div class="modal-foot"><button class="btn sm btn-ghost" data-act="dialog-cancel">Cancel</button><button class="btn sm ${d.danger ? 'btn-ghost danger' : 'btn-primary'}" data-act="dialog-ok">${d.label}</button></div>
    </div></div>`;
  }
  const ask = dialog => { S.dialog = dialog; render(); };

  let toastTimer;
  function toast(msg, isError) {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast' + (isError ? ' err' : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5000 : 3200);
  }

  // ---------- router + render ----------
  function route() {
    const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'library', arg: parts[1], params: new URLSearchParams(qs || '') };
  }

  const PAGES = {
    library: () => (S.entries.length ? ({ split: splitView, grid: gridView, shelves: shelvesView }[prefs.view] || splitView)() : emptyLibrary()),
    store: r => (r.arg === 'browse' ? browsePage(r.params) : storeHome()),
    game: gamePage,
    downloads: downloadsPage,
    settings: settingsPage,
  };
  const ACTIVE = { library: 'library', store: 'store', game: 'store', downloads: 'downloads', settings: 'settings' };

  const scrolls = new Map();
  function render() {
    const r = route();
    // Keep focus and scroll position across re-renders.
    const a = document.activeElement;
    const focus = a?.id ? { sel: '#' + CSS.escape(a.id), start: a.selectionStart, end: a.selectionEnd }
      : a?.dataset?.act ? { sel: ['act', 'id', 'v', 'k'].filter(k => a.dataset[k] !== undefined).map(k => `[data-${k}="${CSS.escape(a.dataset[k])}"]`).join('') } : null;
    document.querySelectorAll('[data-keep-scroll]').forEach(el => scrolls.set(location.hash + '|' + el.dataset.keepScroll, el.scrollTop));

    let page;
    if (S.error) page = `<div class="page" style="display:flex"><div class="empty"><div class="empty-title">Can’t reach Hydro</div><div class="empty-sub">${esc(S.error)}</div><button class="btn btn-primary big" data-act="retry">Try again</button></div></div>`;
    else page = S.loaded ? (PAGES[r.name] || PAGES.library)(r) : '';
    $('app').innerHTML = `<div class="app">${topbar(ACTIVE[r.name] || 'library', r)}<main class="main">${page}</main></div>`;
    $('layer').innerHTML = S.dialog ? confirmDialog() : S.modal ? addModal() : '';

    document.querySelectorAll('[data-keep-scroll]').forEach(el => { el.scrollTop = scrolls.get(location.hash + '|' + el.dataset.keepScroll) || 0; });
    // With a dialog open, focus stays inside it.
    const layer = $('layer'), open = !!layer.firstElementChild;
    const scope = open ? layer : document;
    const target = (focus && scope.querySelector(focus.sel)) || (open ? layer.querySelector('.btn-primary, .danger') : null);
    if (target) {
      target.focus({ preventScroll: true });
      if (focus?.start != null) try { target.setSelectionRange(focus.start, focus.end); } catch {}
    }
  }

  async function load() {
    try {
      const [games, users] = await Promise.all([api('/games'), api('/users')]);
      if (!users.some(u => u._id === user._id)) { Hydro.clearUser(); location.replace('/login.html'); return; }
      S.games = games;
      S.entries = (await api('/library/user/' + user._id)).filter(e => e.game);
      S.error = null;
    } catch (err) {
      S.error = err.message === 'Failed to fetch' ? 'The server isn’t responding. Check that it’s running, then try again.' : err.message;
    }
    S.loaded = true;
  }

  // ---------- actions ----------
  function finishModal(install, openLibrary) {
    const m = S.modal;
    S.modal = null;
    run(async () => {
      const e = entry(m.entryId);
      const body = {};
      if (install && m.install) body.installed = true;
      if (m.fav) body.favorite = true;
      if (Object.keys(body).length) await patch(e, body);
      if (openLibrary) {
        Object.assign(S, { selectedId: e._id, filter: 'all', genre: null, query: '', shelf: 'all' });
        location.hash = '#/library';
      } else toast(`${e.game.title} is in your library`);
    });
  }

  const ACT = {
    retry: () => { S.loaded = false; render(); load().then(render); },
    select: d => { S.selectedId = d.id; S.menu = null; render(); },
    filter: d => { S.filter = d.v; render(); },
    genre: d => { S.genre = S.genre === d.v ? null : d.v; render(); },
    shelf: d => { S.shelf = d.v; render(); },
    view: d => { prefs.view = d.v; savePrefs(); render(); },
    pref: d => { prefs[d.k] = !prefs[d.k]; savePrefs(); render(); },
    menu: d => { S.menu = S.menu === d.id ? null : d.id; render(); },
    open: d => { S.menu = null; location.hash = '#/game/' + d.id; },
    golib: d => { Object.assign(S, { selectedId: d.id, filter: 'all', genre: null, query: '' }); location.hash = '#/library'; },

    play: d => run(async () => {
      const e = entry(d.id);
      if (e.installed) { await patch(e, { hoursPlayed: e.hoursPlayed + 1 }); toast(`Logged 1 h in ${e.game.title}`); }
      else { await patch(e, { installed: true }); toast(`${e.game.title} is installed`); }
    }),
    uninstall: d => run(async () => { const e = entry(d.id); await patch(e, { installed: false }); toast(`${e.game.title} was uninstalled`); }),
    fav: d => run(async () => { const e = entry(d.id); await patch(e, { favorite: !e.favorite }); }),
    remove: d => {
      S.menu = null;
      const e = S.entries.find(x => x._id === d.id);
      if (!e) return render();
      const go = () => run(async () => {
        await api('/library/' + e._id, 'DELETE');
        S.entries = S.entries.filter(x => x._id !== e._id);
        toast(`Removed ${e.game.title} from your library`);
      });
      if (!prefs.confirmRemove) return go();
      ask({ title: 'Remove from library?', body: `<b>${esc(e.game.title)}</b> will be removed from your library, along with its playtime and favorite status.`, label: 'Remove', danger: true, onOk: go });
    },
    add: d => run(async () => {
      const created = await api('/library', 'POST', { user: user._id, game: d.id });
      S.entries.push({ ...created, game: gameById(d.id) });
      S.modal = { entryId: created._id, gameId: d.id, install: true, fav: false };
    }),

    'modal-install': () => { S.modal.install = !S.modal.install; render(); },
    'modal-fav': () => { S.modal.fav = !S.modal.fav; render(); },
    'modal-confirm': () => finishModal(true, true),
    'modal-view': () => finishModal(false, true),
    'modal-skip': () => finishModal(false, false),
    'modal-bg': (d, el, ev) => { if (ev.target === el) finishModal(false, false); },
    'dialog-ok': () => { const { onOk } = S.dialog; S.dialog = null; onOk(); },
    'dialog-cancel': () => { S.dialog = null; render(); },
    'dialog-bg': (d, el, ev) => { if (ev.target === el) ACT['dialog-cancel'](); },

    signout: () => { Hydro.clearUser(); location.replace('/login.html'); },
    'delete-account': () => ask({
      title: 'Delete your account?', danger: true, label: 'Delete account',
      body: `This permanently deletes <b>${esc(user.username)}</b> and the ${plural(S.entries.length, 'game')} in your library. This can’t be undone.`,
      onOk: () => run(async () => { await api('/users/' + user._id, 'DELETE'); Hydro.clearUser(); location.replace('/login.html'); }),
    }),
  };

  const SUBMIT = {
    search: form => {
      const q = form.q.value.trim();
      location.hash = '#/store/browse' + (q ? '?q=' + encodeURIComponent(q) : '');
    },
  };

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (S.menu && !ev.target.closest('.menu-wrap')) { S.menu = null; if (!el) return render(); }
    if (el && ACT[el.dataset.act]) { ev.preventDefault(); ACT[el.dataset.act](el.dataset, el, ev); }
  });
  document.addEventListener('input', ev => {
    if (ev.target.dataset.in === 'query') { S.query = ev.target.value; render(); }
  });
  document.addEventListener('change', ev => {
    if (ev.target.dataset.change === 'sort') { S.sort = ev.target.value; render(); }
  });
  document.addEventListener('submit', ev => {
    const k = ev.target.dataset.submit;
    if (SUBMIT[k]) { ev.preventDefault(); SUBMIT[k](ev.target); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (S.dialog) ACT['dialog-cancel']();
    else if (S.modal) finishModal(false, false);
    else if (S.menu) { S.menu = null; render(); }
  });
  window.addEventListener('hashchange', () => { S.menu = null; render(); });

  render();
  load().then(render);
})();
