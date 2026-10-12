(() => {
  const $ = id => document.getElementById(id);
  const form = $('form');
  let mode = 'signin';

  function setMode(next) {
    mode = next;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('on', t.dataset.mode === mode));
    document.querySelectorAll('[data-only]').forEach(el => { el.hidden = el.dataset.only !== mode; });
    $('submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    $('password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    $('password').placeholder = mode === 'signin' ? '••••••••••' : 'At least 8 characters';
    $('error').textContent = $('note').textContent = '';
    (mode === 'register' ? $('username') : $('email')).focus();
  }

  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // Not supported by the API yet; say so instead of pretending.
  const unavailable = what => () => {
    $('error').textContent = '';
    $('note').textContent = `${what} isn't available yet. Sign in with your password.`;
  };
  $('forgot').addEventListener('click', unavailable('Password reset'));
  $('code').addEventListener('click', unavailable('Email sign-in codes'));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    $('error').textContent = $('note').textContent = '';
    const email = $('email').value.trim(), password = $('password').value;
    if (mode === 'register' && $('username').value.trim().length < 3) return void ($('error').textContent = 'Username must be at least 3 characters');
    if (!email) return void ($('error').textContent = 'Enter your email');
    if (!password) return void ($('error').textContent = 'Enter your password');
    if (mode === 'register' && password.length < 8) return void ($('error').textContent = 'Password must be at least 8 characters');

    $('submit').disabled = true;
    try {
      const user = mode === 'signin'
        ? await Hydro.api('/auth/login', 'POST', { email, password })
        : await Hydro.api('/auth/register', 'POST', { username: $('username').value.trim(), email, password });
      Hydro.setUser(user, mode === 'register' || $('remember').checked);
      location.replace('/');
    } catch (err) {
      $('error').textContent = err.message;
      $('submit').disabled = false;
    }
  });

  // Tilted covers: real catalogue titles when there are any, else the design's samples.
  const fallback = ['Tidefall', 'Hollow Vale', 'Neon Drift'];
  function paintTilts(games) {
    document.querySelectorAll('[data-tilt]').forEach(el => {
      const g = games[+el.dataset.tilt] || fallback[+el.dataset.tilt];
      el.style.background = Hydro.art.cover(g);
      el.classList.toggle('has-art', !!g.cover);
      el.querySelector('.cover-name').textContent = g.title || g;
    });
  }
  paintTilts([]);
  const FEATURED = ['Elden Ring', 'Hades', 'Hollow Knight'];
  Hydro.api('/games').then(games => {
    const pick = FEATURED.map(t => games.find(g => g.title === t && g.cover)).filter(Boolean);
    paintTilts(pick.length === 3 ? pick : games.filter(g => g.cover).slice(0, 3));
  }).catch(() => {});
})();
