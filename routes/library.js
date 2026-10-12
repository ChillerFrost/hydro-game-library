const router = require('express').Router();
const LibraryEntry = require('../models/LibraryEntry');
const User = require('../models/User');
const Game = require('../models/Game');

// Add a game to a user's library
router.post('/', async (req, res, next) => {
  try {
    const { user, game } = req.body;
    if (!(await User.exists({ _id: user }))) return res.status(404).json({ error: 'User not found' });
    if (!(await Game.exists({ _id: game }))) return res.status(404).json({ error: 'Game not found' });
    res.status(201).json(await LibraryEntry.create({ user, game }));
  } catch (e) { next(e); }
});

// A user's library, with game details populated. ?favorite=true&installed=true
router.get('/user/:userId', async (req, res, next) => {
  try {
    const filter = { user: req.params.userId };
    for (const k of ['favorite', 'installed']) if (req.query[k]) filter[k] = req.query[k] === 'true';
    res.json(await LibraryEntry.find(filter).populate('game'));
  } catch (e) { next(e); }
});

// Update installed / favorite / hoursPlayed
router.patch('/:id', async (req, res, next) => {
  try {
    const { installed, favorite, hoursPlayed } = req.body;
    const update = Object.fromEntries(Object.entries({ installed, favorite, hoursPlayed })
      .filter(([, v]) => v !== undefined));
    const entry = await LibraryEntry.findByIdAndUpdate(req.params.id, update,
      { new: true, runValidators: true }).populate('game');
    if (!entry) return res.status(404).json({ error: 'Library entry not found' });
    res.json(entry);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const entry = await LibraryEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Library entry not found' });
    // A game that leaves the library leaves the user's collections too
    await require('../models/Collection').updateMany({ user: entry.user }, { $pull: { games: entry.game } });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
