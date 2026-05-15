import axios from 'axios';

export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      params: {
        per_page: 200,
        page: 1
      }
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Failed to fetch activities:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}