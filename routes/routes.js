// backend/routes/routes.js

const express = require('express');
const router = express.Router();
const Route = require('../models/Route');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_QUERY_LENGTH = 100;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInteger = (value) => {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

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
  const rawQuery = req.query.query;
  const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  const rawPage = req.query.page ?? String(DEFAULT_PAGE);
  const rawLimit = req.query.limit ?? String(DEFAULT_LIMIT);
  const pageNumber = parsePositiveInteger(rawPage);
  const pageSize = parsePositiveInteger(rawLimit);

  if (!query) {
    return res.status(400).json({ error: 'A non-empty query parameter is required' });
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ error: `Query cannot exceed ${MAX_QUERY_LENGTH} characters` });
  }

  if (pageNumber === null) {
    return res.status(400).json({ error: 'Page must be a positive integer' });
  }

  if (pageSize === null || pageSize > MAX_LIMIT) {
    return res.status(400).json({ error: `Limit must be a positive integer no greater than ${MAX_LIMIT}` });
  }

  try {
    const regex = new RegExp(escapeRegExp(query), 'i');
    const skip = (pageNumber - 1) * pageSize;

    const searchQuery = {
      $or: [
        { name: regex },
        { crag: regex },
        { area: regex },
      ],
      'videos.0': { $exists: true },
    };

    const totalResults = await Route.countDocuments(searchQuery);
    const routes = await Route.find(searchQuery)
      .select('-videos')
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalResults / pageSize);
    res.json({
      totalResults,
      totalPages,
      currentPage: pageNumber,
      routes,
    });
  } catch (err) {
    console.error('Error searching routes:', err);
    res.status(500).json({ error: 'An error occurred while searching routes' });
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