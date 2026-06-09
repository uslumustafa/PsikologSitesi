const express = require('express');
const router = express.Router();

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get Google Business reviews
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: Review list (or configured:false if Google API not set up)
 */
// Returns Google Business reviews via the Places API.
// The API key stays server-side. If credentials aren't configured, responds
// with configured:false so the frontend gracefully falls back to curated cards.
router.get('/', async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return res.json({ success: true, configured: false, data: { reviews: [] } });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
      `&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&language=tr&key=${apiKey}`;

    const response = await fetch(url);
    const json = await response.json();

    if (json.status !== 'OK') {
      console.error('Google Places API error:', json.status, json.error_message || '');
      return res.json({ success: true, configured: true, error: json.status, data: { reviews: [] } });
    }

    const result = json.result || {};
    res.json({
      success: true,
      configured: true,
      data: {
        name: result.name,
        rating: result.rating,
        total: result.user_ratings_total,
        reviews: (result.reviews || []).map(r => ({
          author: r.author_name,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description,
          profilePhoto: r.profile_photo_url || null
        }))
      }
    });
  } catch (error) {
    console.error('Reviews fetch error:', error.message);
    res.json({ success: true, configured: true, error: error.message, data: { reviews: [] } });
  }
});

module.exports = router;
