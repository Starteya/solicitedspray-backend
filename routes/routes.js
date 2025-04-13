// backend/routes/routes.js

const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

// Get all routes with videos
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find({ 'videos.0': { $exists: true } }).select('-videos');
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search routes
router.get('/search', async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
    
    if (!query) {
        return res.status(400).json({error:'Query parameter is require'});
    }
    
  try {
      // case-insensitive regex from query
      const regex = new RegExp(query, 'i');
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);
      
      const skip = (pageNumber -1) * pageSize;
      
      // find routes where name, crag, or area matches the query
    const searchQuery = {
        $or: [ 
            {name: regex},
            {crag: regex},
            {area: regex},
        ],
        'videos.0': {$exists: true},
    };
      const totalResults = await Route.countDocuments(searchQuery);
      
    const routes = await Route.find(searchQuery)
    .select('-videos') // selects all fields but video field
    .skip(skip)
    .limit(pageSize);
      
      const totalPages = Math.ceil(totalResults / pageSize);
      
      res.json({
          totalResults, totalPages, currentPage: pageNumber, routes,
      });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get route details with videos
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;