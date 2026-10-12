const Game = require('./models/Game');
const LibraryEntry = require('./models/LibraryEntry');
const catalogue = require('./data/games');

// Makes the games collection match data/games.js. Games are matched by title,
// so existing _ids (and the library entries that reference them) are kept.
module.exports = async function syncCatalogue() {
  await Game.bulkWrite(catalogue.map(({ title, ...fields }) => ({
    updateOne: { filter: { title }, update: { $set: fields }, upsert: true },
  })));

  const stale = await Game.find({ title: { $nin: catalogue.map(g => g.title) } }, '_id');
  if (stale.length) {
    const ids = stale.map(g => g._id);
    await LibraryEntry.deleteMany({ game: { $in: ids } });
    await Game.deleteMany({ _id: { $in: ids } });
  }
  console.log(`Catalogue synced: ${catalogue.length} games${stale.length ? `, removed ${stale.length} not in the list` : ''}`);
};
