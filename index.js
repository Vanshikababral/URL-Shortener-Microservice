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
          // Get next short_url ID
          let count = await Url.countDocuments({});
          let newUrl = new Url({
            original_url: originalUrl,
            short_url: count + 1
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
  const { short_url } = req.params;
  
  try {
    // We parse to Int because the schema stores it as a Number
    const data = await Url.findOne({ short_url: parseInt(short_url) });
    if (data) {
      return res.redirect(data.original_url);
    } else {
      return res.json({ error: 'No short URL found for the given input' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`URL Shortener Microservice listening on port ${PORT}`);
});

