const { Schema, model } = require('mongoose');

// A user-made category of games from their library ("Co-op nights", "Cozy", ...).
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 40 },
  games: [{ type: Schema.Types.ObjectId, ref: 'Game' }],
}, { timestamps: true });
// Names are unique per user, ignoring case ("Cozy" and "cozy" clash).
schema.index({ user: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = model('Collection', schema);
