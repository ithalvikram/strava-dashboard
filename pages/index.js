import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/strava/check-auth');
      if (response.data.authenticated) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [activitiesRes, statsRes, athleteRes] = await Promise.all([
        axios.get('/api/strava/activities'),
        axios.get('/api/strava/stats'),
        axios.get('/api/strava/athlete')
      ]);
      
      setActivities(activitiesRes.data);
      setStats(statsRes.data);
      setAthlete(athleteRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/strava/auth';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial', background: '#F7F8FA' }}>
        <Head>
          <title>Strava Dashboard - Connect</title>
        </Head>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h1 style={{ color: '#FC4C02', marginBottom: '20px' }}>Strava Running Dashboard</h1>
          <p style={{ color: '#6D6D78', marginBottom: '30px' }}>Connect your Strava account to see your running data</p>
          <button 
            onClick={handleLogin}
            style={{
              background: '#FC4C02',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              fontSize: '16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Connect with Strava
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial', background: '#F7F8FA', minHeight: '100vh', padding: '20px' }}>
      <Head>
        <title>Strava Dashboard</title>
      </Head>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
          <h1 style={{ color: '#242428', marginBottom: '10px' }}>Welcome, {athlete?.firstname}!</h1>
          <p style={{ color: '#6D6D78' }}>Your Strava Running Dashboard</p>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: 'white', borderRadius: '8px', padding: '24px', borderTop: '3px solid #FC4C02', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6D6D78', marginBottom: '12px' }}>Total Runs</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#242428' }}>{stats.all_run_totals?.count || 0}</div>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', padding: '24px', borderTop: '3px solid #FC4C02', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6D6D78', marginBottom: '12px' }}>Total Distance</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#242428' }}>
                {((stats.all_run_totals?.distance || 0) / 1000).toFixed(0)} km
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', padding: '24px', borderTop: '3px solid #FC4C02', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6D6D78', marginBottom: '12px' }}>Total Elevation</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#242428' }}>
                {(stats.all_run_totals?.elevation_gain || 0).toFixed(0)} m
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', padding: '24px', borderTop: '3px solid #FC4C02', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6D6D78', marginBottom: '12px' }}>This Month</div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#242428' }}>
                {((stats.recent_run_totals?.distance || 0) / 1000).toFixed(0)} km
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ color: '#242428', marginBottom: '20px' }}>Recent Activities</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#FC4C02', color: 'white' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Distance</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Duration</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>Pace</th>
                </tr>
              </thead>
              <tbody>
                {activities.slice(0, 20).map((activity, index) => {
                  const date = new Date(activity.start_date);
                  const distance = (activity.distance / 1000).toFixed(2);
                  const duration = Math.floor(activity.moving_time / 60);
                  const pace = activity.distance > 0 ? (activity.moving_time / 60) / (activity.distance / 1000) : 0;
                  const paceMin = Math.floor(pace);
                  const paceSec = Math.floor((pace - paceMin) * 60);
                  
                  return (
                    <tr key={activity.id} style={{ borderBottom: '1px solid #E5E5E5' }}>
                      <td style={{ padding: '10px 12px' }}>{date.toLocaleDateString()}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#FC4C02', textDecoration: 'none' }}>
                          {activity.name}
                        </a>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{distance} km</td>
                      <td style={{ padding: '10px 12px' }}>{duration} min</td>
                      <td style={{ padding: '10px 12px' }}>{paceMin}:{paceSec.toString().padStart(2, '0')} /km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}