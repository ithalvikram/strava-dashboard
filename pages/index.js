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
  const [timeFilter, setTimeFilter] = useState('thisWeek');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartsInitialized, setChartsInitialized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Load Chart.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';
    script.async = true;
    script.onload = () => setChartsInitialized(true);
    document.body.appendChild(script);
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

  const applyCustomDateFilter = () => {
    if (startDate && endDate) {
      setTimeFilter('custom');
    }
  };

  // Filter activities based on time range
  const getFilteredActivities = () => {
    const now = new Date();
    const runActivities = activities.filter(a => a.type === 'Run');
    
    return runActivities.filter(activity => {
      const activityDate = new Date(activity.start_date);
      
      switch(timeFilter) {
        case 'thisWeek':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return activityDate >= startOfWeek;
          
        case 'last7Days':
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return activityDate >= sevenDaysAgo;
          
        case 'thisMonth':
          return activityDate.getMonth() === now.getMonth() && 
                 activityDate.getFullYear() === now.getFullYear();
          
        case 'last30Days':
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          return activityDate >= thirtyDaysAgo;
          
        case 'last3Months':
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return activityDate >= threeMonthsAgo;
          
        case 'last6Months':
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return activityDate >= sixMonthsAgo;
          
        case 'thisYear':
          return activityDate.getFullYear() === now.getFullYear();

        case 'custom':
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return activityDate >= start && activityDate <= end;
          }
          return true;
          
        case 'allTime':
        default:
          return true;
      }
    });
  };

  // Initialize charts after component mounts
  useEffect(() => {
    if (chartsInitialized && activeTab === 'run' && activities.length > 0) {
      setTimeout(() => initializeRunCharts(), 100);
    }
    if (chartsInitialized && activeTab === 'gear' && activities.length > 0) {
      setTimeout(() => initializeGearCharts(), 100);
    }
  }, [chartsInitialized, activeTab, activities, timeFilter]);

  const initializeRunCharts = () => {
    if (typeof window === 'undefined' || !window.Chart) return;

    const filteredActs = getFilteredActivities();
    
    // Monthly Distance Chart
    const monthlyCanvas = document.getElementById('monthlyChart');
    if (monthlyCanvas) {
      const monthlyCtx = monthlyCanvas.getContext('2d');
      if (window.monthlyChartInstance) window.monthlyChartInstance.destroy();
      
      const monthlyData = Array(12).fill(0);
      filteredActs.forEach(act => {
        const month = new Date(act.start_date).getMonth();
        monthlyData[month] += act.distance / 1000;
      });

      window.monthlyChartInstance = new window.Chart(monthlyCtx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [{
            label: 'Distance (km)',
            data: monthlyData.map(d => d.toFixed(1)),
            backgroundColor: '#FC4C02',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    }

    // Yearly Distance Chart
    const yearlyCanvas = document.getElementById('yearlyChart');
    if (yearlyCanvas) {
      const yearlyCtx = yearlyCanvas.getContext('2d');
      if (window.yearlyChartInstance) window.yearlyChartInstance.destroy();

      const yearlyData = {};
      activities.filter(a => a.type === 'Run').forEach(act => {
        const year = new Date(act.start_date).getFullYear();
        yearlyData[year] = (yearlyData[year] || 0) + (act.distance / 1000);
      });

      const years = Object.keys(yearlyData).sort();
      const distances = years.map(y => yearlyData[y].toFixed(0));

      window.yearlyChartInstance = new window.Chart(yearlyCtx, {
        type: 'bar',
        data: {
          labels: years,
          datasets: [{
            label: 'Distance (km)',
            data: distances,
            backgroundColor: '#FC4C02',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true }
          }
        }
      });
    }

    // Distance Distribution
    const distCanvas = document.getElementById('distanceDistChart');
    if (distCanvas) {
      const distCtx = distCanvas.getContext('2d');
      if (window.distChartInstance) window.distChartInstance.destroy();

      const bins = [0, 0, 0, 0, 0]; // 0-5, 6-10, 11-15, 16-20, 21+
      filteredActs.forEach(act => {
        const km = act.distance / 1000;
        if (km <= 5) bins[0]++;
        else if (km <= 10) bins[1]++;
        else if (km <= 15) bins[2]++;
        else if (km <= 20) bins[3]++;
        else bins[4]++;
      });

      window.distChartInstance = new window.Chart(distCtx, {
        type: 'bar',
        data: {
          labels: ['0-5 km', '6-10 km', '11-15 km', '16-20 km', '21+ km'],
          datasets: [{
            label: 'Number of Runs',
            data: bins,
            backgroundColor: '#FC4C02',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }

    // Pace Distribution
    const paceCanvas = document.getElementById('paceDistChart');
    if (paceCanvas) {
      const paceCtx = paceCanvas.getContext('2d');
      if (window.paceChartInstance) window.paceChartInstance.destroy();

      const paceBins = Array(9).fill(0);
      const paceLabels = ['<4:00', '4:00-4:30', '4:30-5:00', '5:00-5:30', '5:30-6:00', '6:00-6:30', '6:30-7:00', '7:00-7:30', '>7:30'];
      
      filteredActs.filter(a => a.distance > 0 && a.moving_time > 0).forEach(act => {
        const paceMin = (act.moving_time / 60) / (act.distance / 1000);
        if (paceMin < 4) paceBins[0]++;
        else if (paceMin < 4.5) paceBins[1]++;
        else if (paceMin < 5) paceBins[2]++;
        else if (paceMin < 5.5) paceBins[3]++;
        else if (paceMin < 6) paceBins[4]++;
        else if (paceMin < 6.5) paceBins[5]++;
        else if (paceMin < 7) paceBins[6]++;
        else if (paceMin < 7.5) paceBins[7]++;
        else paceBins[8]++;
      });

      window.paceChartInstance = new window.Chart(paceCtx, {
        type: 'bar',
        data: {
          labels: paceLabels,
          datasets: [{
            label: 'Number of Runs',
            data: paceBins,
            backgroundColor: '#FC4C02',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
      });
    }
  };

  const initializeGearCharts = () => {
    if (typeof window === 'undefined' || !window.Chart) return;

    const shoeCanvas = document.getElementById('shoeDistanceChart');
    if (shoeCanvas) {
      const shoeCtx = shoeCanvas.getContext('2d');
      if (window.shoeChartInstance) window.shoeChartInstance.destroy();

      // Sample data for shoe distance over time
      const months = [];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      
      for (let i = 0; i < 13; i++) {
        const date = new Date(startDate);
        date.setMonth(startDate.getMonth() + i);
        months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
      }

      window.shoeChartInstance = new window.Chart(shoeCtx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Total Distance',
              data: months.map((_, i) => (i + 1) * 50),
              borderColor: '#FC4C02',
              backgroundColor: 'rgba(252, 76, 2, 0.1)',
              borderWidth: 3,
              tension: 0.3,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { display: true }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Distance (km)' }
            }
          }
        }
      });
    }
  };

  // Generate consistency grid data
  const generateConsistencyGrid = () => {
    const filteredActs = getFilteredActivities();
    const activityDates = {};
    
    filteredActs.forEach(act => {
      const date = new Date(act.start_date).toDateString();
      activityDates[date] = (activityDates[date] || 0) + 1;
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const year = now.getFullYear();

    return months.map((month, monthIndex) => {
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const days = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthIndex, day);
        const dateStr = date.toDateString();
        const count = activityDates[dateStr] || 0;
        
        let intensity = '';
        if (count === 0) intensity = '';
        else if (count === 1) intensity = 'light';
        else if (count === 2) intensity = 'medium';
        else if (count === 3) intensity = 'dark';
        else intensity = 'darker';
        
        days.push({ date: day, intensity });
      }
      
      return { month, days };
    });
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

  const filteredActivities = getFilteredActivities();
  const totalRuns = filteredActivities.length;
  const totalDistance = (filteredActivities.reduce((sum, a) => sum + a.distance, 0) / 1000).toFixed(0);
  const totalElevation = filteredActivities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0).toFixed(0);
  const avgPace = calculateAveragePace(filteredActivities);

  const consistencyData = generateConsistencyGrid();

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
          <button 
            style={timeFilter === 'thisWeek' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('thisWeek')}
          >
            This Week
          </button>
          <button 
            style={timeFilter === 'last7Days' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('last7Days')}
          >
            Last 7 Days
          </button>
          <button 
            style={timeFilter === 'thisMonth' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('thisMonth')}
          >
            This Month
          </button>
          <button 
            style={timeFilter === 'last30Days' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('last30Days')}
          >
            Last 30 Days
          </button>
          <button 
            style={timeFilter === 'last3Months' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('last3Months')}
          >
            Last 3 Months
          </button>
          <button 
            style={timeFilter === 'last6Months' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('last6Months')}
          >
            Last 6 Months
          </button>
          <button 
            style={timeFilter === 'thisYear' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('thisYear')}
          >
            This Year
          </button>
          <button 
            style={timeFilter === 'allTime' ? {...styles.filterBtn, ...styles.filterBtnActive} : styles.filterBtn}
            onClick={() => setTimeFilter('allTime')}
          >
            All Time
          </button>
          <input 
            type="date" 
            style={styles.dateInput}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input 
            type="date" 
            style={styles.dateInput}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
        </div>

        <button style={styles.applyBtn} onClick={applyCustomDateFilter}>Apply</button>

        {/* RUN TAB */}
        {activeTab === 'run' && (
          <div>
            <div style={styles.metricsGrid}>
              <MetricCard label="Runs" value={totalRuns} />
              <MetricCard label="Total Distance" value={`${totalDistance} km`} />
              <MetricCard label="Total Elevation" value={`${totalElevation} m`} />
              <MetricCard label="Avg Pace" value={avgPace} />
            </div>

            <h3 style={styles.prHeading}>Personal Records</h3>
<div style={styles.prGrid}>
  <PRCard label="5K PR" time={calculate5KPR(filteredActivities).time} pace={calculate5KPR(filteredActivities).pace} />
  <PRCard label="10K PR" time={calculate10KPR(filteredActivities).time} pace={calculate10KPR(filteredActivities).pace} />
  <PRCard label="Half Marathon PR" time={calculateHalfMarathonPR(filteredActivities).time} pace={calculateHalfMarathonPR(filteredActivities).pace} />
</div>

            {/* Consistency Grid */}
            <div style={styles.consistencyCard}>
              <h3 style={styles.consistencyHeading}>Consistency Grid</h3>
              <div style={styles.monthsContainer}>
                {consistencyData.map((monthData, idx) => (
                  <div key={idx} style={styles.monthCol}>
                    <div style={styles.monthLabel}>{monthData.month}</div>
                    <div style={styles.daysGrid}>
                      {monthData.days.map((day, dayIdx) => (
                        <div 
                          key={dayIdx} 
                          style={{
                            ...styles.dayCell,
                            ...(day.intensity === 'light' && styles.dayCellLight),
                            ...(day.intensity === 'medium' && styles.dayCellMedium),
                            ...(day.intensity === 'dark' && styles.dayCellDark),
                            ...(day.intensity === 'darker' && styles.dayCellDarker),
                          }}
                          title={`${monthData.month} ${day.date}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Monthly Distance</h3>
                <canvas id="monthlyChart"></canvas>
              </div>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Yearly Distance</h3>
                <canvas id="yearlyChart"></canvas>
              </div>
            </div>

            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Distance Distribution</h3>
                <canvas id="distanceDistChart"></canvas>
              </div>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>Pace Distribution</h3>
                <canvas id="paceDistChart"></canvas>
              </div>
            </div>

            {/* Top 10 Tables */}
            <div style={styles.topTablesGrid}>
              <div style={styles.tableCard}>
                <h4 style={styles.tableTitle}>Longest Runs</h4>
                <table style={styles.runsTable}>
                  <thead>
                    <tr>
                      <th style={styles.runsTableHeader}>#</th>
                      <th style={styles.runsTableHeader}>Date</th>
                      <th style={styles.runsTableHeader}>Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredActivities]
                      .sort((a, b) => b.distance - a.distance)
                      .slice(0, 10)
                      .map((activity, idx) => {
                        const date = new Date(activity.start_date);
                        const distance = (activity.distance / 1000).toFixed(2);
                        return (
                          <tr key={activity.id}>
                            <td style={styles.runsTableCell}><span style={styles.rank}>{idx + 1}</span></td>
                            <td style={styles.runsTableCell}>
                              <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {date.toLocaleDateString()}
                              </a>
                            </td>
                            <td style={styles.runsTableCell}>{distance} km</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div style={styles.tableCard}>
                <h4 style={styles.tableTitle}>Most Elevated Runs</h4>
                <table style={styles.runsTable}>
                  <thead>
                    <tr>
                      <th style={styles.runsTableHeader}>#</th>
                      <th style={styles.runsTableHeader}>Date</th>
                      <th style={styles.runsTableHeader}>Elevation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredActivities]
                      .sort((a, b) => (b.total_elevation_gain || 0) - (a.total_elevation_gain || 0))
                      .slice(0, 10)
                      .map((activity, idx) => {
                        const date = new Date(activity.start_date);
                        const elevation = Math.round(activity.total_elevation_gain || 0);
                        return (
                          <tr key={activity.id}>
                            <td style={styles.runsTableCell}><span style={styles.rank}>{idx + 1}</span></td>
                            <td style={styles.runsTableCell}>
                              <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {date.toLocaleDateString()}
                              </a>
                            </td>
                            <td style={styles.runsTableCell}>{elevation} m</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div style={styles.tableCard}>
                <h4 style={styles.tableTitle}>Fastest Runs</h4>
                <table style={styles.runsTable}>
                  <thead>
                    <tr>
                      <th style={styles.runsTableHeader}>#</th>
                      <th style={styles.runsTableHeader}>Date</th>
                      <th style={styles.runsTableHeader}>Pace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredActivities]
                      .filter(a => a.distance > 0 && a.moving_time > 0)
                      .sort((a, b) => {
                        const paceA = (a.moving_time / 60) / (a.distance / 1000);
                        const paceB = (b.moving_time / 60) / (b.distance / 1000);
                        return paceA - paceB;
                      })
                      .slice(0, 10)
                      .map((activity, idx) => {
                        const date = new Date(activity.start_date);
                        const pace = (activity.moving_time / 60) / (activity.distance / 1000);
                        const paceMin = Math.floor(pace);
                        const paceSec = Math.floor((pace - paceMin) * 60);
                        return (
                          <tr key={activity.id}>
                            <td style={styles.runsTableCell}><span style={styles.rank}>{idx + 1}</span></td>
                            <td style={styles.runsTableCell}>
                              <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noopener noreferrer" style={styles.link}>
                                {date.toLocaleDateString()}
                              </a>
                            </td>
                            <td style={styles.runsTableCell}>{paceMin}:{paceSec.toString().padStart(2, '0')} /km</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activities */}
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
                    {filteredActivities.slice(0, 20).map((activity) => {
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

        {/* GEAR TAB */}
        {activeTab === 'gear' && (
          <div>
            <h2 style={styles.sectionTitle}>👟 Your Gear</h2>
            
            <div style={styles.shoeGrid}>
              <div style={{...styles.shoeCard, ...styles.shoeCardActive}}>
                <div style={styles.shoeHeader}>
                  <div style={styles.shoeIcon}>👟</div>
                  <div>
                    <h3 style={styles.shoeName}>Current Shoes</h3>
                    <div style={styles.shoeType}>Road Running</div>
                  </div>
                </div>
                <div style={styles.distanceBig}>
                  {totalDistance} <span style={styles.distanceUnit}>km</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{...styles.progressFill, width: `${Math.min((totalDistance / 700) * 100, 100)}%`}}></div>
                </div>
                <div style={styles.progressLabel}>{Math.min(Math.round((totalDistance / 700) * 100), 100)}% of 700 km lifespan</div>
                <div style={styles.statsGrid}>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>🏃</span>
                    <div>
                      <div style={styles.statValue}>{totalRuns}</div>
                      <span style={styles.statLabel}>Uses</span>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>📏</span>
                    <div>
                      <div style={styles.statValue}>{totalRuns > 0 ? (totalDistance / totalRuns).toFixed(2) : 0} km</div>
                      <span style={styles.statLabel}>Avg Dist</span>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>⛰️</span>
                    <div>
                      <div style={styles.statValue}>{totalRuns > 0 ? Math.round(totalElevation / totalRuns) : 0}m</div>
                      <span style={styles.statLabel}>Avg Elev</span>
                    </div>
                  </div>
                  <div style={styles.statItem}>
                    <span style={styles.statIcon}>⚡</span>
                    <div>
                      <div style={styles.statValue}>{avgPace}</div>
                      <span style={styles.statLabel}>Avg Pace</span>
                    </div>
                  </div>
                </div>
                {totalDistance > 700 && (
                  <div style={styles.replacementBanner}>
                    <span style={styles.replacementText}>⚠️ Replacement Recommended!</span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.chartTitle}>Distance Over Time</h3>
              <canvas id="shoeDistanceChart"></canvas>
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div>
            <div style={styles.metricsGrid}>
              <MetricCard label="Total Runs" value={totalRuns} />
              <MetricCard label="Total Distance" value={`${totalDistance} km`} />
              <MetricCard label="Total Elevation" value={`${totalElevation} m`} />
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
                    {filteredActivities.map((activity) => {
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

        {/* RACES TAB */}
        {activeTab === 'races' && (
          <div>
            <div style={styles.raceStatsGrid}>
              <MetricCard label="Total Races" value={filteredActivities.filter(a => a.workout_type === 1).length} />
              <MetricCard label="10K Runs" value={filteredActivities.filter(a => a.distance >= 9500 && a.distance <= 10500).length} />
              <MetricCard label="Half Marathons" value={filteredActivities.filter(a => a.distance >= 20000 && a.distance <= 22000).length} />
            </div>

            <div style={styles.tableCard}>
              <h3 style={styles.tableTitle}>Race Results</h3>
              <div style={{overflowX: 'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Date</th>
                      <th style={styles.tableHeader}>Activity</th>
                      <th style={styles.tableHeader}>Distance (km)</th>
                      <th style={styles.tableHeader}>Elevation (m)</th>
                      <th style={styles.tableHeader}>Pace /km</th>
                      <th style={styles.tableHeader}>Avg HR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities
                      .filter(a => a.workout_type === 1 || a.distance >= 5000)
                      .slice(0, 20)
                      .map((activity) => {
                        const date = new Date(activity.start_date);
                        const distance = (activity.distance / 1000).toFixed(2);
                        const elevation = Math.round(activity.total_elevation_gain || 0);
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
                            <td style={styles.tableCell}>{distance}</td>
                            <td style={styles.tableCell}>{elevation}</td>
                            <td style={styles.tableCell}>{paceMin}:{paceSec.toString().padStart(2, '0')} /km</td>
                            <td style={styles.tableCell}>{activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div style={{textAlign: 'center', padding: '60px 20px'}}>
            <h2 style={{color: '#242428', marginBottom: '16px'}}>📅 Calendar Tab</h2>
            <p style={{color: '#6D6D78'}}>Calendar view coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper functions
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
function calculate5KPR(activities) {
  const fiveKRuns = activities.filter(a => a.distance >= 4900 && a.distance <= 5100 && a.moving_time > 0);
  if (fiveKRuns.length === 0) return { time: '--:--', pace: '--:-- /km' };
  
  const fastest = fiveKRuns.reduce((best, current) => {
    const currentTime = current.moving_time;
    const bestTime = best.moving_time;
    return currentTime < bestTime ? current : best;
  });
  
  const minutes = Math.floor(fastest.moving_time / 60);
  const seconds = fastest.moving_time % 60;
  const time = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  const paceMinPerKm = (fastest.moving_time / 60) / (fastest.distance / 1000);
  const paceMin = Math.floor(paceMinPerKm);
  const paceSec = Math.floor((paceMinPerKm - paceMin) * 60);
  const pace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
  
  return { time, pace };
}

function calculate10KPR(activities) {
  const tenKRuns = activities.filter(a => a.distance >= 9900 && a.distance <= 10100 && a.moving_time > 0);
  if (tenKRuns.length === 0) return { time: '--:--', pace: '--:-- /km' };
  
  const fastest = tenKRuns.reduce((best, current) => {
    const currentTime = current.moving_time;
    const bestTime = best.moving_time;
    return currentTime < bestTime ? current : best;
  });
  
  const minutes = Math.floor(fastest.moving_time / 60);
  const seconds = fastest.moving_time % 60;
  const time = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  const paceMinPerKm = (fastest.moving_time / 60) / (fastest.distance / 1000);
  const paceMin = Math.floor(paceMinPerKm);
  const paceSec = Math.floor((paceMinPerKm - paceMin) * 60);
  const pace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
  
  return { time, pace };
}

function calculateHalfMarathonPR(activities) {
  const halfMarathonRuns = activities.filter(a => a.distance >= 21000 && a.distance <= 21200 && a.moving_time > 0);
  if (halfMarathonRuns.length === 0) return { time: '--:--:--', pace: '--:-- /km' };
  
  const fastest = halfMarathonRuns.reduce((best, current) => {
    const currentTime = current.moving_time;
    const bestTime = best.moving_time;
    return currentTime < bestTime ? current : best;
  });
  
  const hours = Math.floor(fastest.moving_time / 3600);
  const minutes = Math.floor((fastest.moving_time % 3600) / 60);
  const seconds = fastest.moving_time % 60;
  const time = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const paceMinPerKm = (fastest.moving_time / 60) / (fastest.distance / 1000);
  const paceMin = Math.floor(paceMinPerKm);
  const paceSec = Math.floor((paceMinPerKm - paceMin) * 60);
  const pace = `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
  
  return { time, pace };
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

// Styles
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
    marginBottom: '16px',
    alignItems: 'center',
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
  dateInput: {
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    border: '1px solid #E5E5E5',
    background: 'white',
    color: '#6D6D78',
    width: '140px',
  },
  applyBtn: {
    padding: '10px 32px',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    border: '2px solid #FC4C02',
    background: '#FC4C02',
    color: 'white',
    transition: 'all 0.2s',
    marginBottom: '24px',
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
  consistencyCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  consistencyHeading: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#639922',
    margin: '0 0 24px 0',
  },
  monthsContainer: {
    display: 'flex',
    gap: '24px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  monthCol: {
    minWidth: '80px',
  },
  monthLabel: {
    fontSize: '12px',
    color: '#6D6D78',
    marginBottom: '8px',
    textAlign: 'center',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 11px)',
    gap: '3px',
  },
  dayCell: {
    width: '11px',
    height: '11px',
    borderRadius: '2px',
    background: '#E5E5E5',
  },
  dayCellLight: { background: '#FFC299' },
  dayCellMedium: { background: '#FF8547' },
  dayCellDark: { background: '#FC4C02' },
  dayCellDarker: { background: '#C73D02' },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  chartCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#242428',
    margin: '0 0 24px 0',
  },
  topTablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  tableCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  tableTitle: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#242428',
    marginBottom: '20px',
  },
  runsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  runsTableHeader: {
    textAlign: 'left',
    padding: '8px 12px',
    color: '#6D6D78',
    fontWeight: '500',
    borderBottom: '1px solid #E5E5E5',
  },
  runsTableCell: {
    padding: '10px 12px',
    borderBottom: '1px solid #E5E5E5',
  },
  rank: {
    color: '#6D6D78',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#242428',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  shoeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  shoeCard: {
    background: 'white',
    border: '1px solid #E5E5E5',
    borderRadius: '8px',
    padding: '24px',
    borderTop: '4px solid #FF8C00',
  },
  shoeCardActive: {
    borderTopColor: '#FC4C02',
  },
  shoeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  shoeIcon: {
    width: '48px',
    height: '48px',
    background: '#F7F8FA',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  shoeName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#242428',
    margin: 0,
  },
  shoeType: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#FF8C00',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  distanceBig: {
    fontSize: '48px',
    fontWeight: '700',
    color: '#FF8C00',
    textAlign: 'center',
    margin: '20px 0',
  },
  distanceUnit: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#6D6D78',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#E5E5E5',
    borderRadius: '4px',
    overflow: 'hidden',
    margin: '12px 0',
  },
  progressFill: {
    height: '100%',
    background: '#FF8C00',
    borderRadius: '4px',
    transition: 'width 0.3s',
  },
  progressLabel: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#6D6D78',
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginTop: '16px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '18px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#242428',
  },
  statLabel: {
    fontSize: '11px',
    color: '#6D6D78',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
  },
  replacementBanner: {
    background: 'rgba(255,68,68,0.1)',
    border: '1px solid #FF4444',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    marginTop: '16px',
  },
  replacementText: {
    color: '#FF4444',
    fontWeight: '600',
    fontSize: '13px',
  },
  raceStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
};