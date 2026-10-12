const router = require('express').Router();
const User = require('../models/User');

router.post('/', async (req, res, next) => {
  try {
    const { username, email } = req.body;
    res.status(201).json(await User.create({ username, email }));
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try { res.json(await User.find().sort('username')); } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await require('../models/LibraryEntry').deleteMany({ user: user._id }); // cascade
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
