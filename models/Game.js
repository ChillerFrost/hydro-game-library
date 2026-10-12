const { Schema, model } = require('mongoose');

module.exports = model('Game', new Schema({
  title: { type: String, required: true, unique: true, trim: true },
  developer: { type: String, required: true, trim: true },
  genre: { type: String, required: true, trim: true },
  releaseYear: { type: Number, min: 1970, max: 2100 },
}, { timestamps: true }));
