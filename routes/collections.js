const router = require('express').Router();
const Collection = require('../models/Collection');
const LibraryEntry = require('../models/LibraryEntry');
const User = require('../models/User');

const notFound = res => res.status(404).json({ error: 'Collection not found' });

// Create a collection {user, name}
router.post('/', async (req, res, next) => {
  try {
    const { user, name } = req.body;
    if (!(await User.exists({ _id: user }))) return res.status(404).json({ error: 'User not found' });
    res.status(201).json(await Collection.create({ user, name }));
  } catch (e) { next(e); }
});

// A user's collections, oldest first
router.get('/user/:userId', async (req, res, next) => {
  try { res.json(await Collection.find({ user: req.params.userId }).sort('createdAt')); } catch (e) { next(e); }
});

// Rename {name}
router.patch('/:id', async (req, res, next) => {
  try {
    const col = await Collection.findByIdAndUpdate(req.params.id, { name: req.body.name },
      { new: true, runValidators: true });
    if (!col) return notFound(res);
    res.json(col);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!(await Collection.findByIdAndDelete(req.params.id))) return notFound(res);
    res.status(204).end();
  } catch (e) { next(e); }
});

// Add a game {game}; it must already be in the owner's library
router.post('/:id/games', async (req, res, next) => {
  try {
    const col = await Collection.findById(req.params.id);
    if (!col) return notFound(res);
    if (!(await LibraryEntry.exists({ user: col.user, game: req.body.game })))
      return res.status(400).json({ error: 'Add the game to your library first' });
    res.json(await Collection.findByIdAndUpdate(col._id, { $addToSet: { games: req.body.game } }, { new: true }));
  } catch (e) { next(e); }
});

router.delete('/:id/games/:gameId', async (req, res, next) => {
  try {
    const col = await Collection.findByIdAndUpdate(req.params.id, { $pull: { games: req.params.gameId } }, { new: true });
    if (!col) return notFound(res);
    res.json(col);
  } catch (e) { next(e); }
});

module.exports = router;
