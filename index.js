require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dns = require('dns');
const urlModule = require('url');
const mongoose = require('mongoose');
const app = express();

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('MongoDB connection error:', err));

// URL Schema
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/shorturl
app.post('/api/shorturl', (req, res) => {
  const originalUrl = req.body.url;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const urlObj = new urlModule.URL(originalUrl);
    
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    dns.lookup(urlObj.hostname, async (err) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }

      try {
        // Check if URL already exists
        let findOne = await Url.findOne({ original_url: originalUrl });
        if (findOne) {
          return res.json({
            original_url: findOne.original_url,
            short_url: findOne.short_url
          });
        } else {
          // Get next short_url ID by finding the highest one
          const lastUrl = await Url.findOne().sort({ short_url: -1 });
          const nextId = lastUrl ? lastUrl.short_url + 1 : 1;

          let newUrl = new Url({
            original_url: originalUrl,
            short_url: nextId
          });
          await newUrl.save();
          res.json({
            original_url: newUrl.original_url,
            short_url: newUrl.short_url
          });
        }
      } catch (dbErr) {
        res.status(500).json({ error: 'Database error' });
      }
    });
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }
});

// GET /api/shorturl/:short_url
app.get('/api/shorturl/:short_url', async (req, res) => {
  const short = parseInt(req.params.short_url); // Convert to number

  try {
    const data = await Url.findOne({ short_url: short });

    if (!data) {
      return res.json({ error: 'No short URL found for the given input' });
    }

    // Force a clean HTTP 302 redirect for FCC test compatibility
    res.writeHead(302, {
      Location: data.original_url
    });
    return res.end();

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});





const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener Microservice listening on port ${PORT}`);
});

