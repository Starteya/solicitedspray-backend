// backend/services/youtubeService.js

const axios = require('axios');
const redisClient = require('./redisClient');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Optionally prefix cache keys
const CACHE_KEY_PREFIX = 'youtube:';

const searchYouTubeVideos = async (query) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${query.toLowerCase()}`;

  // Check if the data is in the cache
  try {
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Serving YouTube data from cache for query: "${query}"`);
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.error('Redis Get Error:', err);
  }

  const url = 'https://www.googleapis.com/youtube/v3/search';

  try {
    const response = await axios.get(url, {
      params: {
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 5,
        key: YOUTUBE_API_KEY,
      },
    });

    const videos = response.data.items.map((item) => ({
      platform: 'YouTube',
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
    }));

    // Store the response in the cache with an expiration time
    try {
      await redisClient.set(cacheKey, JSON.stringify(videos), {
        EX: 1209600, // Expires in 14 days
      });
      console.log(`YouTube data cached in Redis Cloud for query: "${query}"`);
    } catch (err) {
      console.error('Redis Set Error:', err);
    }

    return videos;
  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    return [];
  }
};

module.exports = searchYouTubeVideos;