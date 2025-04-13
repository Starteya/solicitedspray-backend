// backend/models/Route.js

const mongoose = require('mongoose');

// Data schema for Mongoose Database
const RouteSchema = new mongoose.Schema({
  name: { type: String, index: true},
  grade: String,
  yds: String,
  sector: String,
  crag: {type: String, index: true},
  area: {type: String, index: true},
  location: String,
  country: String,
  videos: [
    {
      platform: String,
      url: String,
      title: String,
      description: String,
      thumbnail: String,
    },
  ],
});

module.exports = mongoose.model('Route', RouteSchema);