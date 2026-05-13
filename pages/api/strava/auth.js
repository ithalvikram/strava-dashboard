export default async function handler(req, res) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = process.env.CODESPACE_NAME 
    ? `https://${process.env.CODESPACE_NAME}-3000.app.github.dev/api/strava/callback`
    : `http://localhost:3000/api/strava/callback`;

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`;

  res.redirect(stravaAuthUrl);
}