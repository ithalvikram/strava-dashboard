import axios from 'axios';

export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Get all activities to extract gear IDs
    const activitiesResponse = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        per_page: 200,
        page: 1
      }
    });

    const activities = activitiesResponse.data;
    const gearIds = new Set();

    // Collect all unique gear IDs from activities
    activities.forEach(activity => {
      if (activity.gear_id) {
        gearIds.add(activity.gear_id);
      }
    });

    console.log('Found gear IDs:', Array.from(gearIds));

    if (gearIds.size === 0) {
      return res.status(200).json([]);
    }

    // Fetch detailed information for each gear item
    const gearPromises = Array.from(gearIds).map(id => 
      axios.get(`https://www.strava.com/api/v3/gear/${id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).catch(err => {
        console.error(`Failed to fetch gear ${id}:`, err.message);
        return null;
      })
    );

    const gearResponses = await Promise.all(gearPromises);
    const gearData = gearResponses
      .filter(response => response !== null)
      .map(response => response.data)
      .filter(gear => !gear.retired); // Only return active (non-retired) gear

    console.log('Returning gear data:', gearData.length, 'items');
    res.status(200).json(gearData);
  } catch (error) {
    console.error('Failed to fetch gear:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch gear', details: error.message });
  }
}