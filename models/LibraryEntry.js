const { Schema, model } = require('mongoose');

// Join model: one user owns one game once, with per-user state.
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  installed: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  hoursPlayed: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
schema.index({ user: 1, game: 1 }, { unique: true });

module.exports = model('LibraryEntry', schema);
