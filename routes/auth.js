const router = require('express').Router();
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/User');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, hex] = (stored || '').split(':');
  if (!salt || !hex) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}

// Create an account {username, email, password}
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const user = await User.create({ username, email, passwordHash: await hashPassword(password) });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

// Sign in {email, password}
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = typeof email === 'string'
      && await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || typeof password !== 'string' || !(await verifyPassword(password, user.passwordHash)))
      return res.status(401).json({ error: 'Incorrect email or password' });
    res.json(user);
  } catch (e) { next(e); }
});

module.exports = router;
