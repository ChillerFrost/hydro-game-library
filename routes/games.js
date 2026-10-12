const router = require('express').Router();
const Game = require('../models/Game');

// The catalogue is read-only over the API; it comes from data/games.js.

// Optional filters: ?genre=RPG&q=title-substring
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.genre) filter.genre = req.query.genre;
    if (req.query.q) filter.title = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    res.json(await Game.find(filter).sort('title'));
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
