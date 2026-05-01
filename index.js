const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const url = require('url');
const app = express();

const fs = require('fs');
const path = require('path');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'urls.json');

// Helper to load/save data
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { urls: {}, counter: 1 };
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return content ? JSON.parse(content) : { urls: {}, counter: 1 };
  } catch (err) {
    return { urls: {}, counter: 1 };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/shorturl
app.post('/api/shorturl', (req, res) => {
  let originalUrl = req.body.url;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const urlObj = new url.URL(originalUrl);
    
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    dns.lookup(urlObj.hostname, (err) => {
      // If dns.lookup fails, it might be an invalid url or network issue in test env
      // However, we must pass FCC test 4. 
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      const data = loadData();
      
      // Check if already in database (case-sensitive check as URLs are case-sensitive in paths)
      const existingId = Object.keys(data.urls).find(key => data.urls[key] === originalUrl);
      
      if (existingId) {
        return res.json({ 
          original_url: originalUrl, 
          short_url: parseInt(existingId) 
        });
      }

      const shortUrl = data.counter++;
      data.urls[shortUrl] = originalUrl;
      saveData(data);

      res.json({ 
        original_url: originalUrl, 
        short_url: shortUrl 
      });
    });
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrlParam = req.params.short_url;
  const data = loadData();
  const originalUrl = data.urls[shortUrlParam];

  if (originalUrl) {
    return res.redirect(originalUrl);
  } else {
    return res.json({ error: 'No short URL found for the given input' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener Microservice listening on port ${PORT}`);
});
