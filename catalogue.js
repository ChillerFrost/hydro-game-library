const Game = require('./models/Game');
const LibraryEntry = require('./models/LibraryEntry');
const Collection = require('./models/Collection');
const catalogue = require('./data/games');
const media = require('./data/media.json');

// Makes the games collection match data/games.js (plus art, screenshots and
// trailers from data/media.json). Games are matched by title,
// so existing _ids (and the library entries that reference them) are kept.
module.exports = async function syncCatalogue() {
  await Game.bulkWrite(catalogue.map(({ title, ...fields }) => {
    const { steamName, ...m } = media[title] || {};
    return { updateOne: { filter: { title }, update: { $set: { ...fields, ...m } }, upsert: true } };
  }));

  const stale = await Game.find({ title: { $nin: catalogue.map(g => g.title) } }, '_id');
  if (stale.length) {
    const ids = stale.map(g => g._id);
    await LibraryEntry.deleteMany({ game: { $in: ids } });
    await Collection.updateMany({}, { $pull: { games: { $in: ids } } });
    await Game.deleteMany({ _id: { $in: ids } });
  }
  console.log(`Catalogue synced: ${catalogue.length} games${stale.length ? `, removed ${stale.length} not in the list` : ''}`);
};
