const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const urlModule = require('url');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage is actually more reliable for these quick tests on ephemeral platforms
const urlDatabase = {};
let idCounter = 1;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/shorturl
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  // Basic format check first
  try {
    const urlObj = new urlModule.URL(originalUrl);
    
    // Test 4 requires checking for http/https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    // Hint says use dns.lookup
    dns.lookup(urlObj.hostname, (err) => {
      if (err) {
        // If it's a valid format but host not found, FCC still expects 'invalid url'
        return res.json({ error: 'invalid url' });
      }

      // Generate a new ID and store as a string to avoid type mismatches during GET
      const shortUrl = idCounter++;
      urlDatabase[shortUrl.toString()] = originalUrl;

      res.json({ 
        original_url: originalUrl, 
        short_url: shortUrl 
      });
    });
  } catch (err) {
    // If URL constructor fails, it's definitely invalid
    return res.json({ error: 'invalid url' });
  }
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = req.params.short_url;
  
  // Look up using the string key, but also try parsing as an integer
  // because the database used to use numeric keys.
  const originalUrl = urlDatabase[shortUrl] || urlDatabase[parseInt(shortUrl)];

  if (originalUrl) {
    return res.redirect(originalUrl);
  } else {
    // FCC expects this specific error if the short link doesn't exist
    return res.json({ error: 'No short URL found for the given input' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener Microservice listening on port ${PORT}`);
});
