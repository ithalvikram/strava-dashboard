import axios from 'axios';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_at } = response.data;

    // In production, you'd store these in a database
    // For now, we'll use cookies (temporary solution)
    res.setHeader('Set-Cookie', [
      `strava_access_token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=21600`,
      `strava_refresh_token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
      `strava_expires_at=${expires_at}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`
    ]);

    res.redirect('/');
  } catch (error) {
    console.error('Strava OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
}