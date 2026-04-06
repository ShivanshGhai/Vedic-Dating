const express = require('express');
const path = require('path');

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const apiBaseUrl = process.env.FRONTEND_API_URL || process.env.API_URL || 'http://localhost:4000';

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date() });
});

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.__ASHTAKOOTA_CONFIG__ = ${JSON.stringify({ API_BASE_URL: apiBaseUrl })};`);
});

app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Ashtakoota frontend listening on port ${port}`);
});
