const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Simple in-memory database
const urlDatabase = {};
let idCounter = 1;

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/shorturl
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  try {
    const parsedUrl = new url.URL(originalUrl);
    
    // Check if protocol is http: or https:
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    // Verify host with dns.lookup
    dns.lookup(parsedUrl.hostname, (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      // If already in database, return existing entry
      const existingId = Object.keys(urlDatabase).find(key => urlDatabase[key] === originalUrl);
      if (existingId) {
        return res.json({ original_url: originalUrl, short_url: parseInt(existingId) });
      }

      // Save to database
      const shortUrl = idCounter++;
      urlDatabase[shortUrl] = originalUrl;

      res.json({ original_url: originalUrl, short_url: shortUrl });
    });
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  const originalUrl = urlDatabase[shortUrl];

  if (originalUrl) {
    res.redirect(originalUrl);
  } else {
    res.json({ error: 'No short URL found for the given input' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener Microservice listening on port ${PORT}`);
});
