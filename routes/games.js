const router = require('express').Router();
const Game = require('../models/Game');
const { search } = require('../public/js/search');

// The catalogue is read-only over the API; it comes from data/games.js.

// Optional filters: ?genre=RPG  ?q=search text (results ranked closest first)  ?limit=8
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.genre) filter.genre = req.query.genre;
    const games = await Game.find(filter).sort('title');
    const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 1, 1), 100) : Infinity;
    res.json(req.query.q ? search(games, String(req.query.q), limit) : games.slice(0, limit));
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (e) { next(e); }
});

module.exports = router;
