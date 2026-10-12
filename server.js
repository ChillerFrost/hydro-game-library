require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use('/api', require('./logger'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/games', require('./routes/games'));
app.use('/api/library', require('./routes/library'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

// Central error handler: maps Mongoose/Mongo errors to HTTP codes
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid ${err.path}` });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate value', fields: err.keyValue });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(require('./catalogue'))
  .then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Hydro running on http://localhost:${port}`));
  })
  .catch(err => { console.error('MongoDB connection failed:', err.message); process.exit(1); });
