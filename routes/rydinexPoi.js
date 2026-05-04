const express = require('express');
const router = express.Router();

// Map app categories to Google Places types
const CATEGORY_TYPE_MAP = {
  restaurant: 'restaurant',
  gas_station: 'gas_station',
  hotel: 'lodging',
  pharmacy: 'pharmacy',
};

// GET /api/rydinex-poi/nearby
router.get('/nearby', async (req, res) => {
  const { latitude, longitude, radius, category, limit } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radiusKm = parseFloat(radius) || 1.5;
  const radiusMeters = Math.min(Math.round(radiusKm * 1000), 50000);
  const maxResults = Math.min(parseInt(limit) || 8, 20);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'POI service unavailable' });
  }

  const placeType =
    category && CATEGORY_TYPE_MAP[category]
      ? CATEGORY_TYPE_MAP[category]
      : 'point_of_interest';

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', radiusMeters);
  url.searchParams.set('type', placeType);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch POI data' });
    }

    const json = await response.json();

    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      // Places API not enabled or key issue — return empty results so the app continues working
      console.warn(`rydinex-poi: Places API returned status ${json.status}`);
      return res.json({ data: [] });
    }

    const results = (json.results || []).slice(0, maxResults);

    const data = results.map(place => ({
      id: place.place_id,
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      category:
        (category && CATEGORY_TYPE_MAP[category]) ? category : (place.types?.[0] || 'point_of_interest'),
      rating: place.rating ?? null,
      vicinity: place.vicinity || null,
    }));

    return res.json({ data });
  } catch (err) {
    console.error('rydinex-poi error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
