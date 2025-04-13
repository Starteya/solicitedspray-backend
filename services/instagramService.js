// backend/services/instagramService.js

const axios = require('axios');

const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;

const searchInstagramMedia = async (query) => {
  // Instagram API doesn't support keyword search for public content
  // You can only access media from your own account
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v16.0/${INSTAGRAM_USER_ID}/media`,
      {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url',
          access_token: INSTAGRAM_ACCESS_TOKEN,
        },
      }
    );

    const mediaItems = response.data.data;

    // Filter media items matching the query
    const filteredMedia = mediaItems.filter(
      (item) =>
        item.media_type === 'VIDEO' &&
        item.caption &&
        item.caption.toLowerCase().includes(query.toLowerCase())
    );

    return filteredMedia.map((item) => ({
      platform: 'Instagram',
      url: item.permalink,
      title: item.caption,
      description: item.caption,
      thumbnail: item.thumbnail_url || item.media_url,
    }));
  } catch (error) {
    console.error('Instagram API Error:', error.response?.data || error.message);
    return [];
  }
};

module.exports = searchInstagramMedia;