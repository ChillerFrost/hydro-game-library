const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'logs');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'api.log');

// Appends one line per API call: time, method, URL, status, and the data
// returned from the database (the created/updated/fetched documents).
module.exports = (req, res, next) => {
  const start = Date.now();
  const origJson = res.json.bind(res);
  let payload;
  res.json = body => { payload = body; return origJson(body); };

  res.on('finish', () => {
    const data = Array.isArray(payload) ? `${payload.length} document(s)` : JSON.stringify(payload ?? null);
    const line = `${new Date().toISOString()} ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
      + (['POST', 'PUT', 'PATCH'].includes(req.method) ? ` body=${JSON.stringify(req.body, (k, v) => (k === 'password' ? '[redacted]' : v))}` : '')
      + ` db=${data}\n`;
    fs.appendFile(file, line, err => err && console.error('log write failed:', err.message));
  });
  next();
};
