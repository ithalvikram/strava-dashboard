export default async function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  // Get the actual host from the request
  const host = req.headers.host;
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/strava/callback`;

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`;

  res.redirect(stravaAuthUrl);
}