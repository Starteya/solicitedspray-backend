// backend/services/vimeoService.js

const axios = require('axios');
const redisClient = require('./redisClient'); // Adjust the path according to your project structure

const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;

// Optionally define a cache key prefix
const CACHE_KEY_PREFIX = 'vimeo:';

const searchVimeoVideos = async (query) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase()}`;

  // Check if the data is in the cache
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Serving Vimeo data from cache for query: "${query}"`);
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.error('Redis Get Error:', err);
    // If there's an error with Redis, proceed without cached data
  }

  const url = 'https://api.vimeo.com/videos';
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
      },
      params: {
        query,
        per_page: 5,
      },
    });

    const videos = response.data.data.map((item) => ({
      platform: 'Vimeo',
      url: item.link,
      title: item.name,
      description: item.description,
      thumbnail: item.pictures?.sizes?.pop()?.link || '', // Safely access thumbnail
    }));

    // Store the response in the cache with an expiration time
    try {
      await redisClient.set(cacheKey, JSON.stringify(videos), {
        EX: 1209600, // Expires in 14 days  (604800 seconds)
      });
      console.log(`Vimeo data cached in Redis for query: "${query}"`);
    } catch (err) {
      console.error('Redis Set Error:', err);
      // If caching fails, continue without interrupting the flow
    }

    return videos;
  } catch (error) {
    console.error('Vimeo API Error:', error.response?.data || error.message);
    return [];
  }
};

module.exports = searchVimeoVideos;