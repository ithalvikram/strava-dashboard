import axios from 'axios';

export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // First, get the athlete data which contains gear IDs
    const athleteResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const athlete = athleteResponse.data;
    const gearIds = [];

    // Collect all unique gear IDs from shoes
    if (athlete.shoes) {
      athlete.shoes.forEach(shoe => {
        if (shoe.id && !gearIds.includes(shoe.id)) {
          gearIds.push(shoe.id);
        }
      });
    }

    // Fetch detailed information for each gear item
    const gearPromises = gearIds.map(id => 
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

    res.status(200).json(gearData);
  } catch (error) {
    console.error('Failed to fetch gear:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch gear' });
  }
}