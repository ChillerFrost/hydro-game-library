const { Schema, model } = require('mongoose');

module.exports = model('Game', new Schema({
  title: { type: String, required: true, unique: true, trim: true },
  developer: { type: String, required: true, trim: true },
  genre: { type: String, required: true, trim: true },
  releaseYear: { type: Number, min: 1970, max: 2100 },
  // Store media (from data/media.json); all optional.
  steamAppId: Number,
  description: String,
  cover: String, // 600x900 portrait art
  header: String, // 460x215 banner
  hero: String, // wide background, no logo
  screenshots: [{ _id: false, thumb: String, full: String }],
  trailer: { _id: false, name: String, hls: String, thumbnail: String },
}, { timestamps: true }));
