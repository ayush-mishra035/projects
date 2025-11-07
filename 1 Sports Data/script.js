// Enhanced sports data structure with location data
let teamsData = [
  { 
    name: "Titans", 
    players: 11, 
    matches: 15, 
    wins: 10, 
    losses: 5, 
    totalRuns: 1250, 
    totalWickets: 95,
    founded: 2020,
    captain: "John Smith",
    location: { lat: 40.7128, lng: -74.0060, city: "New York" },
    homeGround: "Titan Stadium"
  },
  { 
    name: "Warriors", 
    players: 11, 
    matches: 12, 
    wins: 8, 
    losses: 4, 
    totalRuns: 980, 
    totalWickets: 78,
    founded: 2019,
    captain: "Mike Johnson",
    location: { lat: 34.0522, lng: -118.2437, city: "Los Angeles" },
    homeGround: "Warrior Arena"
  },
  { 
    name: "Falcons", 
    players: 11, 
    matches: 18, 
    wins: 12, 
    losses: 6, 
    totalRuns: 1450, 
    totalWickets: 112,
    founded: 2021,
    captain: "David Brown",
    location: { lat: 41.8781, lng: -87.6298, city: "Chicago" },
    homeGround: "Falcon Field"
  }
];

// Sample players data
let playersData = [
  { name: "John Smith", team: "Titans", matches: 15, runs: 450, average: 30.0 },
  { name: "Mike Johnson", team: "Warriors", matches: 12, runs: 380, average: 31.7 },
  { name: "David Brown", team: "Falcons", matches: 18, runs: 520, average: 28.9 },
  { name: "Alex Wilson", team: "Titans", matches: 14, runs: 410, average: 29.3 },
  { name: "Chris Davis", team: "Warriors", matches: 16, runs: 480, average: 30.0 },
  { name: "Tom Miller", team: "Falcons", matches: 13, runs: 390, average: 30.0 }
];

let charts = {};
let weatherData = {};
let currentLocation = { lat: 40.7128, lng: -74.0060, city: "New York" };
let map;
let weatherUpdateInterval;
// Add clock interval holder
let clockInterval;

// Preferences and storage
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORAGE_KEYS = { teams: 'sportstats_teams', players: 'sportstats_players', theme: 'sportstats_theme', liveKey: 'sportstats_live_api_key', liveHost: 'sportstats_live_api_host', liveHubKey: 'sportstats_live_apihub_key' }; // removed apiKey
let userMarker; // marker for current user location

// Load persisted data (if available)
function loadFromStorage() {
  try {
    const t = localStorage.getItem(STORAGE_KEYS.teams);
    const p = localStorage.getItem(STORAGE_KEYS.players);
    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    // NEW: load live API creds
    const lk = localStorage.getItem(STORAGE_KEYS.liveKey);
    const lh = localStorage.getItem(STORAGE_KEYS.liveHost);
    const hk = localStorage.getItem(STORAGE_KEYS.liveHubKey);
    if (t) teamsData = JSON.parse(t);
    if (p) playersData = JSON.parse(p);
    if (theme) applyTheme(theme);
  } catch (_) {}
}

function persistData() {
  try {
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(teamsData));
    localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(playersData));
  } catch (_) {}
}

function applyTheme(mode) {
  const body = document.body;
  if (mode === 'dark') {
    body.classList.add('dark');
  } else {
    body.classList.remove('dark');
  }
  localStorage.setItem(STORAGE_KEYS.theme, mode);
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');
  const icon = document.querySelector('#themeToggle i');
  if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// Toasts and busy overlay
function showToast(msg, type = 'info', timeout = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), timeout);
}

function setBusy(show) {
  const el = document.getElementById('appBusy');
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

// Online/offline
function setOfflineBanner(visible) {
  const el = document.getElementById('offlineBanner');
  if (el) el.classList.toggle('hidden', !visible);
}

// Override animations for reduced motion
const chartAnimDuration = prefersReducedMotion ? 0 : 1200;

// Enhanced initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing enhanced platform...');
  try {
    // Load settings BEFORE building UI
    loadFromStorage();
    // Initialize all components
    loadPlayerTable(playersData);
    loadAllCharts();
    loadTopPlayer();
    loadTeamStats();
    populateTeamOptions();
    updateTeamSelect();
    // NEW: populate player team dropdown
    populatePlayerTeamOptions();
    // Initialize map
    initializeMap();
    initializeRealTimeUpdates();
    // Start live clock
    startLiveClock();
    
    // After building UI:
    window.addEventListener('online',  () => setOfflineBanner(false));
    window.addEventListener('offline', () => setOfflineBanner(true));
    setOfflineBanner(!navigator.onLine);

    // Update theme toggle icon state
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
    applyTheme(savedTheme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    console.log('Enhanced platform initialized successfully');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
  
  addEventListeners();
});

function addEventListeners() {
  try {
    const elements = {
      teamSelect: document.getElementById('teamSelect'),
      addTeamBtn: document.getElementById('addTeamBtn'),
      saveTeamBtn: document.getElementById('saveTeamBtn'),
      cancelTeamBtn: document.getElementById('cancelTeamBtn'),
      exportBtn: document.getElementById('exportBtn'),
      team1Select: document.getElementById('team1Select'),
      team2Select: document.getElementById('team2Select'),
      // NEW: player management elements
      addPlayerBtn: document.getElementById('addPlayerBtn'),
      savePlayerBtn: document.getElementById('savePlayerBtn'),
      cancelPlayerBtn: document.getElementById('cancelPlayerBtn')
    };

    // Check if all elements exist
    Object.keys(elements).forEach(key => {
      if (!elements[key]) {
        console.warn(`Element ${key} not found`);
      }
    });

    if (elements.teamSelect) {
      elements.teamSelect.addEventListener('change', filterByTeam);
    }
    if (elements.addTeamBtn) {
      elements.addTeamBtn.addEventListener('click', showAddTeamForm);
    }
    if (elements.saveTeamBtn) {
      elements.saveTeamBtn.addEventListener('click', saveNewTeam);
    }
    if (elements.cancelTeamBtn) {
      elements.cancelTeamBtn.addEventListener('click', hideAddTeamForm);
    }
    if (elements.exportBtn) {
      elements.exportBtn.addEventListener('click', exportData);
    }
    if (elements.team1Select) {
      elements.team1Select.addEventListener('change', updateComparison);
    }
    if (elements.team2Select) {
      elements.team2Select.addEventListener('change', updateComparison);
    }

    // Import/Export UI bindings
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // NEW: wire import and export-pdf buttons
    if (importBtn && importFile) importBtn.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', handleFileImport);
    if (generateReportBtn) generateReportBtn.addEventListener('click', generatePDFReport);

    // removed: bind live API UI (saveLiveApiKeyBtn/liveApiKeyInput/liveApiHostInput/liveApiHubKeyInput)

    // NEW: Player management event listeners
    if (elements.addPlayerBtn) {
      elements.addPlayerBtn.addEventListener('click', showAddPlayerForm);
    }
    if (elements.savePlayerBtn) {
      elements.savePlayerBtn.addEventListener('click', saveNewPlayer);
    }
    if (elements.cancelPlayerBtn) {
      elements.cancelPlayerBtn.addEventListener('click', hideAddPlayerForm);
    }

    // ...existing code...
  } catch (error) {
    console.error('Error adding enhanced event listeners:', error);
  }
}

// NEW: fetch live scores from AllThingsDev (APIhub) Cricbuzz API using provided snippet
async function fetchApihubLive() {
  const hubKey = localStorage.getItem(STORAGE_KEYS.liveHubKey);
  if (!hubKey) return null;

  try {
    const myHeaders = new Headers();
    myHeaders.append('x-apihub-key', hubKey);
    myHeaders.append('x-apihub-host', 'Cricbuzz-Official-Cricket-API.allthingsdev.co');
    myHeaders.append('x-apihub-endpoint', '95df5edd-bd8b-4881-a12b-1a40e519b693');

    const requestOptions = { method: 'GET', headers: myHeaders, redirect: 'follow' };

    const res = await fetch('https://Cricbuzz-Official-Cricket-API.proxy-production.allthingsdev.co/home', requestOptions);
    if (!res.ok) throw new Error(`APIhub error: ${res.status}`);
    // Try JSON first, fallback to text
    let rawText = await res.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch { /* keep text */ }

    // Attempt to parse similar structure as Cricbuzz live feed
    const items = [];
    if (data && Array.isArray(data.typeMatches)) {
      data.typeMatches.forEach(tm => {
        (tm.seriesMatches || []).forEach(sm => {
          const wrapper = sm.seriesAdWrapper;
          if (!wrapper || !Array.isArray(wrapper.matches)) return;
          wrapper.matches.forEach(m => {
            const info = m.matchInfo || {};
            const score = m.matchScore || {};
            const t1 = info.team1?.teamSName || info.team1?.teamName || 'Team 1';
            const t2 = info.team2?.teamSName || info.team2?.teamName || 'Team 2';
            const t1s = score.team1Score?.inngs1 || score.team1Score?.inngs2 || null;
            const t2s = score.team2Score?.inngs1 || score.team2Score?.inngs2 || null;
            const t1Str = t1s ? `${t1} ${t1s.runs}/${t1s.wickets} (${t1s.overs} ov)` : t1;
            const t2Str = t2s ? `${t2} ${t2s.runs}/${t2s.wickets} (${t2s.overs} ov)` : t2;
            const status = info.status || info.matchDesc || '—';
            items.push({ title: `${t1} vs ${t2}`, line1: t1Str, line2: t2Str, status });
          });
        });
      });
    }

    // Fallback: show first 200 chars of text if no structured items
    if (!items.length) {
      const snippet = (rawText || '').slice(0, 200).replace(/\s+/g, ' ');
      return [{ title: 'Cricbuzz Live (APIhub)', line1: snippet || 'Live data received', line2: '', status: '—' }];
    }

    return items;
  } catch (error) {
    console.warn('APIhub live fetch failed:', error);
    return null;
  }
}

// Existing RapidAPI fetch remains
// async function fetchCricbuzzLive() { ...existing code... }

function updateLiveScores() {
  const container = document.getElementById('liveScores');
  if (!container) return;
  
  const mockScores = [
    { teams: 'Titans vs Warriors', score: '156/4 (18.2 overs)', status: 'Live' },
    { teams: 'Falcons vs Eagles', score: '203/7 (20 overs)', status: 'Complete' }
  ];
  
  container.innerHTML = mockScores.map(score => `
    <div class="live-item">
      <div>${score.teams}</div>
      <div>${score.score}</div>
      <span class="timestamp">${score.status}</span>
    </div>
  `).join('');
}

// Simplify realtime updates: only live scores (keep interval)
function initializeRealTimeUpdates() {
  updateLiveScores();
  setInterval(() => {
    updateLiveScores();
  }, 30000);
}

function loadPlayerTable(data) {
  try {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) {
      console.error('Table body element not found');
      return;
    }
    
    tableBody.innerHTML = '';
    
    data.forEach(player => {
      const row = tableBody.insertRow();
      row.insertCell(0).textContent = player.name;
      row.insertCell(1).textContent = player.team;
      row.insertCell(2).textContent = player.matches;
      row.insertCell(3).textContent = player.runs;
      row.insertCell(4).textContent = player.average.toFixed(1);
    });
    
    console.log(`Loaded ${data.length} players`);
  } catch (error) {
    console.error('Error loading player table:', error);
  }
}

function filterByTeam() {
  try {
    const teamSelect = document.getElementById('teamSelect');
    if (!teamSelect) return;
    
    const selectedTeam = teamSelect.value;
    const filteredData = selectedTeam === 'all' 
      ? playersData 
      : playersData.filter(player => player.team === selectedTeam);
    
    loadPlayerTable(filteredData);
    console.log(`Filtered by team: ${selectedTeam}`);
  } catch (error) {
    console.error('Error filtering by team:', error);
  }
}

function loadAllCharts() {
  try {
    loadRunsChart();
    loadWinRateChart();
    loadPerformanceChart();
    loadComparisonChart();
    console.log('All charts loaded');
  } catch (error) {
    console.error('Error loading charts:', error);
  }
}

function loadRunsChart() {
  try {
    const canvas = document.getElementById('runsChart');
    if (!canvas) {
      console.warn('Runs chart canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.runsChart) {
      charts.runsChart.destroy();
    }
    
    charts.runsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: teamsData.map(team => team.name),
        datasets: [{
          label: '🏃‍♂️ Total Runs',
          data: teamsData.map(team => team.totalRuns),
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(255, 107, 107, 0.8)',
            'rgba(78, 205, 196, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(52, 152, 219, 0.8)'
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(255, 107, 107, 1)',
            'rgba(78, 205, 196, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(155, 89, 182, 1)',
            'rgba(52, 152, 219, 1)'
          ],
          borderWidth: 3,
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: '🎯 Total Wickets',
          data: teamsData.map(team => team.totalWickets),
          backgroundColor: [
            'rgba(118, 75, 162, 0.8)',
            'rgba(238, 90, 36, 0.8)',
            'rgba(68, 160, 141, 0.8)',
            'rgba(230, 174, 0, 0.8)',
            'rgba(142, 68, 173, 0.8)',
            'rgba(41, 128, 185, 0.8)'
          ],
          borderColor: [
            'rgba(118, 75, 162, 1)',
            'rgba(238, 90, 36, 1)',
            'rgba(68, 160, 141, 1)',
            'rgba(230, 174, 0, 1)',
            'rgba(142, 68, 173, 1)',
            'rgba(41, 128, 185, 1)'
          ],
          borderWidth: 3,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: chartAnimDuration ? { duration: chartAnimDuration, easing: 'easeOutQuart' } : false,
        plugins: {
          title: {
            display: true,
            text: '🏆 Team Performance Comparison',
            font: {
              family: 'Orbitron',
              size: 18,
              weight: 'bold'
            },
            color: '#667eea'
          },
          legend: {
            labels: {
              font: {
                family: 'Poppins',
                size: 14,
                weight: '600'
              },
              color: '#2c3e50',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#667eea',
            borderWidth: 2,
            cornerRadius: 10,
            titleFont: {
              family: 'Orbitron',
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Poppins',
              size: 13
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(102, 126, 234, 0.1)',
              lineWidth: 1
            },
            ticks: {
              color: '#667eea',
              font: {
                family: 'Poppins',
                size: 12,
                weight: '600'
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#667eea',
              font: {
                family: 'Orbitron',
                size: 12,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading runs chart:', error);
  }
}

function loadWinRateChart() {
  try {
    const canvas = document.getElementById('winRateChart');
    if (!canvas) {
      console.warn('Win rate chart canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.winRateChart) {
      charts.winRateChart.destroy();
    }
    
    const winRates = teamsData.map(team => 
      team.matches > 0 ? parseFloat((team.wins / team.matches * 100).toFixed(1)) : 0
    );
    
    charts.winRateChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: teamsData.map(team => `${team.name} (${team.matches > 0 ? (team.wins / team.matches * 100).toFixed(1) : 0}%)`),
        datasets: [{
          data: winRates,
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(255, 107, 107, 0.8)',
            'rgba(78, 205, 196, 0.8)',
            'rgba(255, 193, 7, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(52, 152, 219, 0.8)'
          ],
          borderColor: [
            'rgba(102, 126, 234, 1)',
            'rgba(255, 107, 107, 1)',
            'rgba(78, 205, 196, 1)',
            'rgba(255, 193, 7, 1)',
            'rgba(155, 89, 182, 1)',
            'rgba(52, 152, 219, 1)'
          ],
          borderWidth: 4,
          hoverBorderWidth: 6,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: chartAnimDuration ? { animateRotate: true, animateScale: true, duration: chartAnimDuration, easing: 'easeOutQuart' } : false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Poppins',
                size: 12,
                weight: '600'
              },
              color: '#2c3e50',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20
            }
          },
          title: {
            display: true,
            text: '🏆 Win Rate Distribution',
            font: {
              family: 'Orbitron',
              size: 18,
              weight: 'bold'
            },
            color: '#667eea',
            padding: 20
          },
          tooltip: {
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#667eea',
            borderWidth: 2,
            cornerRadius: 10,
            titleFont: {
              family: 'Orbitron',
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Poppins',
              size: 13
            },
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed + '%';
              }
            }
          }
        },
        cutout: '60%'
      }
    });
  } catch (error) {
    console.error('Error loading win rate chart:', error);
  }
}

function loadPerformanceChart() {
  try {
    const canvas = document.getElementById('performanceChart');
    if (!canvas) {
      console.warn('Performance chart canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.performanceChart) {
      charts.performanceChart.destroy();
    }
    
    const colors = [
      'rgba(102, 126, 234, 0.3)',
      'rgba(255, 107, 107, 0.3)',
      'rgba(78, 205, 196, 0.3)',
      'rgba(255, 193, 7, 0.3)',
      'rgba(155, 89, 182, 0.3)',
      'rgba(52, 152, 219, 0.3)'
    ];
    
    const borderColors = [
      'rgba(102, 126, 234, 1)',
      'rgba(255, 107, 107, 1)',
      'rgba(78, 205, 196, 1)',
      'rgba(255, 193, 7, 1)',
      'rgba(155, 89, 182, 1)',
      'rgba(52, 152, 219, 1)'
    ];
    
    charts.performanceChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['📊 Matches Played', '🏆 Win Rate %', '🏃‍♂️ Avg Runs/Match', '🎯 Avg Wickets/Match'],
        datasets: teamsData.map((team, index) => ({
          label: team.name,
          data: [
            Math.min(team.matches * 2, 100), // Normalize for better visualization
            team.matches > 0 ? (team.wins / team.matches * 100) : 0,
            team.matches > 0 ? Math.min((team.totalRuns / team.matches), 100) : 0,
            team.matches > 0 ? Math.min((team.totalWickets / team.matches * 10), 100) : 0
          ],
          backgroundColor: colors[index % colors.length],
          borderColor: borderColors[index % borderColors.length],
          borderWidth: 3,
          pointBackgroundColor: borderColors[index % borderColors.length],
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: chartAnimDuration ? { duration: chartAnimDuration, easing: 'easeOutQuart' } : false,
        plugins: {
          title: {
            display: true,
            text: '⚡ Team Performance Radar',
            font: {
              family: 'Orbitron',
              size: 18,
              weight: 'bold'
            },
            color: '#667eea',
            padding: 20
          },
          legend: {
            labels: {
              font: {
                family: 'Poppins',
                size: 12,
                weight: '600'
              },
              color: '#2c3e50',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#667eea',
            borderWidth: 2,
            cornerRadius: 10,
            titleFont: {
              family: 'Orbitron',
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Poppins',
              size: 13
            }
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(102, 126, 234, 0.2)',
              lineWidth: 2
            },
            angleLines: {
              color: 'rgba(102, 126, 234, 0.3)',
              lineWidth: 2
            },
            ticks: {
              color: '#667eea',
              font: {
                family: 'Poppins',
                size: 10,
                weight: '600'
              },
              backdropColor: 'rgba(255, 255, 255, 0.8)',
              backdropPadding: 4
            },
            pointLabels: {
              color: '#2c3e50',
              font: {
                family: 'Orbitron',
                size: 12,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading performance chart:', error);
  }
}

function loadComparisonChart() {
  // Initialize empty comparison chart
  updateComparison();
}

function loadTopPlayer() {
  try {
    const topPlayerElement = document.getElementById('topPlayer');
    if (!topPlayerElement) {
      console.warn('Top player element not found');
      return;
    }
    
    if (playersData.length === 0) {
      topPlayerElement.textContent = 'No player data available';
      return;
    }
    
    const topPlayer = playersData.reduce((prev, current) => 
      (prev.runs > current.runs) ? prev : current
    );
    
    topPlayerElement.textContent = 
      `🌟 Top Performer: ${topPlayer.name} (${topPlayer.team}) - ${topPlayer.runs} runs`;
  } catch (error) {
    console.error('Error loading top player:', error);
  }
}

function loadTeamStats() {
  try {
    const totalTeams = teamsData.length;
    const totalMatches = teamsData.reduce((sum, team) => sum + team.matches, 0);
    const totalRuns = teamsData.reduce((sum, team) => sum + team.totalRuns, 0);
    const avgWinRate = totalTeams > 0 ? 
      teamsData.reduce((sum, team) => 
        sum + (team.matches > 0 ? team.wins / team.matches : 0), 0) / totalTeams * 100 : 0;
    
    const elements = {
      totalTeams: document.getElementById('totalTeams'),
      totalMatches: document.getElementById('totalMatches'),
      totalRuns: document.getElementById('totalRuns'),
      avgWinRate: document.getElementById('avgWinRate')
    };
    
    if (elements.totalTeams) elements.totalTeams.textContent = totalTeams;
    if (elements.totalMatches) elements.totalMatches.textContent = totalMatches;
    if (elements.totalRuns) elements.totalRuns.textContent = totalRuns.toLocaleString();
    if (elements.avgWinRate) elements.avgWinRate.textContent = avgWinRate.toFixed(1) + '%';
    
    console.log('Team stats updated');
  } catch (error) {
    console.error('Error loading team stats:', error);
  }
}

function populateTeamOptions() {
  try {
    const selects = ['team1Select', 'team2Select'];
    
    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (!select) {
        console.warn(`Select element ${selectId} not found`);
        return;
      }
      
      select.innerHTML = '<option value="">Select Team</option>';
      
      teamsData.forEach(team => {
        const option = document.createElement('option');
        option.value = team.name;
        option.textContent = team.name;
        select.appendChild(option);
      });
    });
    
    console.log('Team options populated');
  } catch (error) {
    console.error('Error populating team options:', error);
  }
}

function updateTeamSelect() {
  try {
    const teamSelect = document.getElementById('teamSelect');
    if (!teamSelect) {
      console.warn('Team select element not found');
      return;
    }
    
    const currentValue = teamSelect.value;
    
    // Clear and rebuild options
    teamSelect.innerHTML = '<option value="all">All Teams</option>';
    
    const uniqueTeams = [...new Set(playersData.map(player => player.team))];
    uniqueTeams.forEach(team => {
      const option = document.createElement('option');
      option.value = team;
      option.textContent = team;
      teamSelect.appendChild(option);
    });
    
    teamSelect.value = currentValue || 'all';
    console.log('Team select updated');
  } catch (error) {
    console.error('Error updating team select:', error);
  }
}

function populatePlayerTeamOptions() {
  try {
    const select = document.getElementById('playerTeam');
    if (!select) {
      console.warn('Player team select not found');
      return;
    }
    
    select.innerHTML = '<option value="">Select Team</option>';
    
    teamsData.forEach(team => {
      const option = document.createElement('option');
      option.value = team.name;
      option.textContent = team.name;
      select.appendChild(option);
    });
    
    console.log('Player team options populated');
  } catch (error) {
    console.error('Error populating player team options:', error);
  }
}

function updateComparison() {
  try {
    const team1Select = document.getElementById('team1Select');
    const team2Select = document.getElementById('team2Select');
    
    if (!team1Select || !team2Select) {
      console.warn('Comparison select elements not found');
      return;
    }
    
    const team1Name = team1Select.value;
    const team2Name = team2Select.value;
    
    if (!team1Name || !team2Name) {
      const canvas = document.getElementById('comparisonChart');
      if (canvas && charts.comparisonChart) {
        charts.comparisonChart.destroy();
        delete charts.comparisonChart;
      }
      return;
    }
    
    const team1 = teamsData.find(t => t.name === team1Name);
    const team2 = teamsData.find(t => t.name === team2Name);
    
    if (!team1 || !team2) {
      console.warn('Selected teams not found in data');
      return;
    }
    
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) {
      console.warn('Comparison chart canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    if (charts.comparisonChart) {
      charts.comparisonChart.destroy();
    }
    
    charts.comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['📊 Matches', '🏆 Wins', '🏃‍♂️ Total Runs', '🎯 Total Wickets', '📈 Win Rate %'],
        datasets: [{
          label: `🔥 ${team1.name}`,
          data: [
            team1.matches,
            team1.wins,
            team1.totalRuns,
            team1.totalWickets,
            team1.matches > 0 ? (team1.wins / team1.matches * 100) : 0
          ],
          backgroundColor: 'rgba(102, 126, 234, 0.8)',
          borderColor: 'rgba(102, 126, 234, 1)',
          borderWidth: 3,
          borderRadius: 8,
          borderSkipped: false,
        }, {
          label: `⚡ ${team2.name}`,
          data: [
            team2.matches,
            team2.wins,
            team2.totalRuns,
            team2.totalWickets,
            team2.matches > 0 ? (team2.wins / team2.matches * 100) : 0
          ],
          backgroundColor: 'rgba(255, 107, 107, 0.8)',
          borderColor: 'rgba(255, 107, 107, 1)',
          borderWidth: 3,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: 'easeOutBounce'
        },
        plugins: {
          title: {
            display: true,
            text: `🔥 ${team1.name} VS ${team2.name} ⚡`,
            font: {
              family: 'Orbitron',
              size: 18,
              weight: 'bold'
            },
            color: '#667eea',
            padding: 20
          },
          legend: {
            labels: {
              font: {
                family: 'Poppins',
                size: 14,
                weight: '600'
              },
              color: '#2c3e50',
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(102, 126, 234, 0.9)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#667eea',
            borderWidth: 2,
            cornerRadius: 10,
            titleFont: {
              family: 'Orbitron',
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              family: 'Poppins',
              size: 13
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(102, 126, 234, 0.1)',
              lineWidth: 1
            },
            ticks: {
              color: '#667eea',
              font: {
                family: 'Poppins',
                size: 12,
                weight: '600'
              }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#667eea',
              font: {
                family: 'Orbitron',
                size: 11,
                weight: 'bold'
              }
            }
          }
        }
      }
    });
    
    console.log(`Comparison updated: ${team1Name} vs ${team2Name}`);
  } catch (error) {
    console.error('Error updating comparison:', error);
  }
}

function showAddTeamForm() {
  try {
    const form = document.getElementById('addTeamForm');
    if (form) {
      form.style.display = 'block';
      console.log('Add team form shown');
    }
  } catch (error) {
    console.error('Error showing add team form:', error);
  }
}

function hideAddTeamForm() {
  try {
    const form = document.getElementById('addTeamForm');
    const teamForm = document.getElementById('teamForm');
    
    if (form) form.style.display = 'none';
    if (teamForm) teamForm.reset();
    
    console.log('Add team form hidden');
  } catch (error) {
    console.error('Error hiding add team form:', error);
  }
}

function saveNewTeam() {
  try {
    setBusy(true);
    const form = document.getElementById('teamForm');
    if (!form) {
      console.error('Team form not found');
      return;
    }
    
    const formData = new FormData(form);
    
    const newTeam = {
      name: formData.get('teamName'),
      players: parseInt(formData.get('players')) || 11,
      matches: parseInt(formData.get('matches')) || 0,
      wins: parseInt(formData.get('wins')) || 0,
      losses: parseInt(formData.get('losses')) || 0,
      totalRuns: parseInt(formData.get('totalRuns')) || 0,
      totalWickets: parseInt(formData.get('totalWickets')) || 0,
      founded: parseInt(formData.get('founded')) || new Date().getFullYear(),
      captain: formData.get('captain') || 'TBD'
    };
    
    // Validation
    if (!newTeam.name) {
      alert('Team name is required!');
      return;
    }
    
    if (teamsData.find(team => team.name.toLowerCase() === newTeam.name.toLowerCase())) {
      alert('Team name already exists!');
      return;
    }
    
    if (newTeam.wins + newTeam.losses > newTeam.matches) {
      alert('Wins + Losses cannot exceed total matches!');
      return;
    }
    
    teamsData.push(newTeam);
    persistData();
    hideAddTeamForm();
    
    // Refresh all components
    loadAllCharts();
    loadTeamStats();
    populateTeamOptions();
    updateTeamSelect();
    // NEW: refresh player team options
    populatePlayerTeamOptions();
    
    showToast(`Team "${newTeam.name}" added`, 'success');
    console.log('New team saved:', newTeam);
  } catch (error) {
    console.error('Error saving new team:', error);
    alert('Error saving team. Please try again.');
  } finally {
    setBusy(false);
  }
}

function exportData() {
  try {
    const data = {
      teams: teamsData,
      players: playersData,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `sports_data_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Data exported successfully');
    alert('Data exported successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Error exporting data. Please try again.');
  }
}

// Add some demo functions for testing
function addSampleData() {
  const sampleTeams = [
    { name: "Eagles", players: 11, matches: 10, wins: 7, losses: 3, totalRuns: 850, totalWickets: 65, founded: 2022, captain: "Sample Captain" }
  ];
  
  sampleTeams.forEach(team => {
    if (!teamsData.find(t => t.name === team.name)) {
      teamsData.push(team);
    }
  });
  
  loadAllCharts();
  loadTeamStats();
  populateTeamOptions();
  updateTeamSelect();
}

// Simplify realtime updates: only live scores (no weather alerts/recommendations)
function initializeRealTimeUpdates() {
  updateLiveScores();
  setInterval(() => {
    updateLiveScores();
  }, 30000);
}

function updateLiveScores() {
  const container = document.getElementById('liveScores');
  if (!container) return;
  
  const mockScores = [
    { teams: 'Titans vs Warriors', score: '156/4 (18.2 overs)', status: 'Live' },
    { teams: 'Falcons vs Eagles', score: '203/7 (20 overs)', status: 'Complete' }
  ];
  
  container.innerHTML = mockScores.map(score => `
    <div class="live-item">
      <div>${score.teams}</div>
      <div>${score.score}</div>
      <span class="timestamp">${score.status}</span>
    </div>
  `).join('');
}

function generatePDFReport() {
  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text('SportStats Analytics Report', 20, 30);
    
    // simplified: remove weather line
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${moment().format('YYYY-MM-DD HH:mm')}`, 20, 50);
    
    // Add team stats
    let yPos = 80;
    pdf.text('Team Statistics:', 20, yPos);
    yPos += 10;
    
    teamsData.forEach(team => {
      const winRate = (team.wins / team.matches * 100).toFixed(1);
      pdf.text(`${team.name}: ${team.matches} matches, ${winRate}% win rate`, 30, yPos);
      yPos += 10;
    });
    
    pdf.save(`sportsstats-report-${moment().format('YYYY-MM-DD')}.pdf`);
    alert('Report generated successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating report. Please try again.');
  }
}

// NEW: handle JSON import from hidden file input
function handleFileImport(event) {
  setBusy(true);
  try {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      setBusy(false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result || '{}');

        // Merge teams
        if (Array.isArray(imported.teams)) {
          imported.teams.forEach(t => {
            if (!t || !t.name) return;
            // replace if exists by name (case-insensitive), else push
            const idx = teamsData.findIndex(x => x.name?.toLowerCase() === String(t.name).toLowerCase());
            if (idx >= 0) teamsData[idx] = { ...teamsData[idx], ...t };
            else teamsData.push(t);
          });
        }

        // Merge players
        if (Array.isArray(imported.players)) {
          imported.players.forEach(p => {
            if (!p || !p.name) return;
            const idx = playersData.findIndex(x => x.name?.toLowerCase() === String(p.name).toLowerCase());
            if (idx >= 0) playersData[idx] = { ...playersData[idx], ...p };
            else playersData.push(p);
          });
        }

        persistData();
        // Refresh UI
        loadAllCharts();
        loadTeamStats();
        populateTeamOptions();
        updateTeamSelect();
        loadPlayerTable(playersData);
        showToast('Data imported successfully', 'success');
      } catch (err) {
        console.error('Import parse error:', err);
        showToast('Invalid file format', 'error');
      } finally {
        // reset input so the same file can be chosen again later
        event.target.value = '';
        setBusy(false);
      }
    };
    reader.readAsText(file);
  } catch (err) {
    console.error('Import error:', err);
    showToast('Import failed', 'error');
    setBusy(false);
  }
}

// Live Clock (aligned to second)
function startLiveClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;

  const render = () => {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' });
    el.innerHTML = `<div class="clk-time">${time}</div><div class="clk-date">${date}</div>`;
    // removed: tick class toggle to prevent blinking
    // el.classList.remove('tick');
    // void el.offsetWidth;
    // el.classList.add('tick');
  };

  if (clockInterval) clearInterval(clockInterval);
  render();
  const toNextSecond = 1000 - (Date.now() % 1000);
  setTimeout(() => {
    render();
    clockInterval = setInterval(render, 1000);
  }, toNextSecond);
}

// Initialize Leaflet map with team locations
function initializeMap() {
  try {
    const mapContainer = document.getElementById('mapContainer');
    if (!mapContainer) {
      console.warn('Map container not found');
      return;
    }

    // Clear any existing map
    if (map) {
      map.remove();
    }

    // Create map centered on US
    map = L.map('mapContainer').setView([39.8283, -98.5795], 4);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);

    // Add team markers
    teamsData.forEach(team => {
      if (team.location && team.location.lat && team.location.lng) {
        const marker = L.marker([team.location.lat, team.location.lng]).addTo(map);
        
        const popupContent = `
          <div class="map-popup">
            <h4>${team.name}</h4>
            <p><strong>Captain:</strong> ${team.captain}</p>
            <p><strong>Home Ground:</strong> ${team.homeGround || 'Not specified'}</p>
            <p><strong>Matches:</strong> ${team.matches}</p>
            <p><strong>Win Rate:</strong> ${team.matches > 0 ? ((team.wins / team.matches) * 100).toFixed(1) : 0}%</p>
            <p><strong>Total Runs:</strong> ${team.totalRuns.toLocaleString()}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });

    console.log('Map initialized with team locations');
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (weatherUpdateInterval) {
    clearInterval(weatherUpdateInterval);
  }
  // Clear clock timer
  if (clockInterval) {
    clearInterval(clockInterval);
  }
});
