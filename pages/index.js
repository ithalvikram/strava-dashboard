import { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('run');

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
      <div style={styles.loadingContainer}>
        <div>Loading your running data...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <Head>
          <title>Strava Dashboard - Connect</title>
        </Head>
        <div style={styles.loginCard}>
          <h1 style={styles.loginTitle}>Strava Running Dashboard</h1>
          <p style={styles.loginSubtext}>Connect your Strava account to see your running data</p>
          <button onClick={handleLogin} style={styles.loginButton}>
            Connect with Strava
          </button>
        </div>
      </div>
    );
  }

  // Calculate running-only stats
  const runningActivities = activities.filter(a => a.type === 'Run');
  const totalRuns = stats?.all_run_totals?.count || 0;
  const totalDistance = ((stats?.all_run_totals?.distance || 0) / 1000).toFixed(0);
  const totalElevation = (stats?.all_run_totals?.elevation_gain || 0).toFixed(0);
  const avgPace = calculateAveragePace(runningActivities);

  return (
    <div style={styles.container}>
      <Head>
        <title>Strava Running Dashboard - {athlete?.firstname}</title>
      </Head>
      
      <div style={styles.dashboard}>
        {/* Tabs */}
        <div style={styles.tabs}>
          <button 
            style={activeTab === 'run' ? {...styles.tabBtn, ...styles.tabBtnActive} : styles.tabBtn}
            onClick={() => setActiveTab('run')}
          >
            🏃 Run
          </button>
          <button 
            style={activeTab === 'gear' ? {...styles.tabBtn, ...styles.tabBtnActive} : styles.tabBtn}
            onClick={() => setActiveTab('gear')}
          >
            👟 Gear
          </button>
          <button 
            style={activeTab === 'calendar' ? {...styles.tabBtn, ...styles.tabBtnActive} : styles.tabBtn}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Calendar
          </button>
          <button 
            style={activeTab === 'activities' ? {...styles.tabBtn, ...styles.tabBtnActive} : styles.tabBtn}
            onClick={() => setActiveTab('activities')}
          >
            📊 Activities
          </button>
          <button 
            style={activeTab === 'races' ? {...styles.tabBtn, ...styles.tabBtnActive} : styles.tabBtn}
            onClick={() => setActiveTab('races')}
          >
            🏆 Races
          </button>
        </div>

        {/* Filter Buttons */}
        <div style={styles.filters}>
          <button style={styles.filterBtn}>This Week</button>
          <button style={styles.filterBtn}>Last 7 Days</button>
          <button style={styles.filterBtn}>This Month</button>
          <button style={{...styles.filterBtn, ...styles.filterBtnActive}}>Last 30 Days</button>
          <button style={styles.filterBtn}>Last 3 Months</button>
          <button style={styles.filterBtn}>Last 6 Months</button>
          <button style={styles.filterBtn}>This Year</button>
          <button style={styles.filterBtn}>All Time</button>
        </div>

        {/* RUN TAB */}
        {activeTab === 'run' && (
          <div>
            {/* Summary Metrics */}
            <div style={styles.metricsGrid}>
              <MetricCard label="Runs" value={totalRuns} />
              <MetricCard label="Total Distance" value={`${totalDistance} km`} />
              <MetricCard label="Total Elevation" value={`${totalElevation} m`} />
              <MetricCard label="Avg Pace" value={avgPace} />
            </div>

            {/* Personal Records */}
            <h3 style={styles.prHeading}>Personal Records</h3>
            <div style={styles.prGrid}>
              <PRCard label="5K PR" time="18:45" pace="3:45 /km" />
              <PRCard label="10K PR" time="38:32" pace="3:51 /km" />
              <PRCard label="Half Marathon PR" time="1:24:18" pace="3:59 /km" />
            </div>

            {/* Recent Activities Table */}
            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>Recent Activities</h3>
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Name</th>
                      <th style={styles.tableHeader}>Distance</th>
                      <th style={styles.tableHeader}>Duration</th>
                      <th style={styles.tableHeader}>Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningActivities.slice(0, 20).map((activity) => {
                      const date = new Date(activity.start_date);
                      const distance = (activity.distance / 1000).toFixed(2);
                      const duration = Math.floor(activity.moving_time / 60);
                      const pace = activity.distance > 0 ? (activity.moving_time / 60) / (activity.distance / 1000) : 0;
                      const paceMin = Math.floor(pace);
                      const paceSec = Math.floor((pace - paceMin) * 60);
                      
                      return (
                        <tr key={activity.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{date.toLocaleDateString()}</td>
                          <td style={styles.tableCell}>
                            <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                              {activity.name}
                            </a>
                          </td>
                          <td style={styles.tableCell}>{distance} km</td>
                          <td style={styles.tableCell}>{duration} min</td>
                          <td style={styles.tableCell}>{paceMin}:{paceSec.toString().padStart(2, '0')} /km</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div>
            <div style={styles.metricsGrid}>
              <MetricCard label="Total Runs" value={runningActivities.length} />
              <MetricCard label="Total Distance" value={`${(runningActivities.reduce((sum, a) => sum + a.distance, 0) / 1000).toFixed(0)} km`} />
              <MetricCard label="Total Elevation" value={`${runningActivities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0).toFixed(0)} m`} />
              <MetricCard label="Average Pace" value={avgPace} />
            </div>

            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>All Activities</h3>
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Name</th>
                      <th style={styles.tableHeader}>Distance</th>
                      <th style={styles.tableHeader}>Duration</th>
                      <th style={styles.tableHeader}>Pace</th>
                      <th style={styles.tableHeader}>Avg HR</th>
                      <th style={styles.tableHeader}>Elevation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningActivities.map((activity) => {
                      const date = new Date(activity.start_date);
                      const distance = (activity.distance / 1000).toFixed(2);
                      const duration = Math.floor(activity.moving_time / 60);
                      const pace = activity.distance > 0 ? (activity.moving_time / 60) / (activity.distance / 1000) : 0;
                      const paceMin = Math.floor(pace);
                      const paceSec = Math.floor((pace - paceMin) * 60);
                      
                      return (
                        <tr key={activity.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{date.toLocaleDateString()}</td>
                          <td style={styles.tableCell}>
                            <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                              {activity.name}
                            </a>
                          </td>
                          <td style={styles.tableCell}>{distance} km</td>
                          <td style={styles.tableCell}>{duration} min</td>
                          <td style={styles.tableCell}>{paceMin}:{paceSec.toString().padStart(2, '0')} /km</td>
                          <td style={styles.tableCell}>{activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}</td>
                          <td style={styles.tableCell}>{activity.total_elevation_gain ? Math.round(activity.total_elevation_gain) : '0'} m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* GEAR TAB */}
        {activeTab === 'gear' && (
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <h2 style={{color: '#242428', marginBottom: '16px'}}>👟 Gear Tab</h2>
            <p style={{color: '#6D6D78'}}>Shoe tracking coming soon! This will show your running shoes and their mileage.</p>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <h2 style={{color: '#242428', marginBottom: '16px'}}>📅 Calendar Tab</h2>
            <p style={{color: '#6D6D78'}}>Calendar view coming soon! This will show your training calendar.</p>
          </div>
        )}

        {/* RACES TAB */}
        {activeTab === 'races' && (
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <h2 style={{color: '#242428', marginBottom: '16px'}}>🏆 Races Tab</h2>
            <p style={{color: '#6D6D78'}}>Race results coming soon! This will show your race history and PRs.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function calculateAveragePace(activities) {
  if (activities.length === 0) return '0:00 /km';
  
  const validActivities = activities.filter(a => a.distance > 0 && a.moving_time > 0);
  if (validActivities.length === 0) return '0:00 /km';
  
  const avgPace = validActivities.reduce((sum, a) => {
    return sum + (a.moving_time / 60) / (a.distance / 1000);
  }, 0) / validActivities.length;
  
  const min = Math.floor(avgPace);
  const sec = Math.floor((avgPace - min) * 60);
  return `${min}:${sec.toString().padStart(2, '0')} /km`;
}

// Components
function MetricCard({ label, value }) {
  return (
    <div style={styles.metricCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function PRCard({ label, time, pace }) {
  return (
    <div style={styles.prCard}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={{...styles.metricValue, fontSize: '28px'}}>{time}</div>
      <div style={styles.metricSubtext}>{pace}</div>
    </div>
  );
}

// Styles object continues in next message...// Styles
const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: '#F7F8FA',
    minHeight: '100vh',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'Arial',
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'Arial',
    background: '#F7F8FA',
  },
  loginCard: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  loginTitle: {
    color: '#FC4C02',
    marginBottom: '20px',
  },
  loginSubtext: {
    color: '#6D6D78',
    marginBottom: '30px',
  },
  loginButton: {
    background: '#FC4C02',
    color: 'white',
    border: 'none',
    padding: '12px 32px',
    fontSize: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  dashboard: {
    maxWidth: '1400px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E5E5',
    paddingBottom: '12px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    padding: '10px 18px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#6D6D78',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#FC4C02',
    color: 'white',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  filterBtn: {
    padding: '8px 18px',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    border: '1px solid #E5E5E5',
    background: 'white',
    color: '#242428',
  },
  filterBtnActive: {
    background: '#FC4C02',
    color: 'white',
    borderColor: '#FC4C02',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    borderTop: '3px solid #FC4C02',
    textAlign: 'center',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#6D6D78',
    marginBottom: '12px',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#242428',
  },
  metricSubtext: {
    fontSize: '12px',
    color: '#6D6D78',
    marginTop: '8px',
  },
  prHeading: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#639922',
    margin: '24px 0 16px 0',
  },
  prGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  prCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    borderTop: '3px solid #639922',
    textAlign: 'center',
  },
  tableCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  tableTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#242428',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeaderRow: {
    background: '#FC4C02',
    color: 'white',
  },
  tableHeader: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: '500',
  },
  tableRow: {
    borderBottom: '1px solid #E5E5E5',
  },
  tableCell: {
    padding: '10px 12px',
  },
  link: {
    color: '#FC4C02',
    textDecoration: 'none',
  },
};