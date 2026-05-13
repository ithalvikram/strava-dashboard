import axios from 'axios';

export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    let allActivities = [];
    let page = 1;
    let hasMore = true;

    // Fetch all activities by paginating (up to 10,000 activities = 50 pages)
    while (hasMore && page <= 50) {
      const response = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params: {
          per_page: 200,
          page: page
        }
      });

      const activities = response.data;
      
      if (activities.length === 0) {
        hasMore = false;
      } else {
        allActivities = allActivities.concat(activities);
        page++;
      }
    }

    console.log(`Fetched ${allActivities.length} total activities`);
    res.status(200).json(allActivities);
  } catch (error) {
    console.error('Failed to fetch activities:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
}