export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const accessToken = cookies.split('; ').find(row => row.startsWith('strava_access_token='))?.split('=')[1];

  if (accessToken) {
    res.status(200).json({ authenticated: true });
  } else {
    res.status(200).json({ authenticated: false });
  }
}