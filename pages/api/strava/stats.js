import axios from 'axios';

export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // First get athlete ID
    const athleteResponse = await axios.get('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const athleteId = athleteResponse.data.id;

    // Then get stats
    const statsResponse = await axios.get(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.status(200).json(statsResponse.data);
  } catch (error) {
    console.error('Failed to fetch stats:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}