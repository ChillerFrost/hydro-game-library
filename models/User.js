const { Schema, model } = require('mongoose');

module.exports = model('User', new Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, match: /^\S+@\S+\.\S+$/ },
  // "salt:hash" from scrypt; never returned unless explicitly selected, never serialized.
  passwordHash: { type: String, select: false },
}, {
  timestamps: true,
  toJSON: { transform: (doc, ret) => { delete ret.passwordHash; return ret; } },
}));
