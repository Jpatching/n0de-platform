import express from 'express';
import chalk from 'chalk';
import DatabaseManager from '../auth/database-manager.js';
import { readFileSync } from 'fs';

const app = express();
const db = new DatabaseManager();

await db.init();

app.use(express.json());
app.use(express.static('public'));

// Dashboard HTML
const dashboardHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>n0de RPC Admin Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .stat-value { font-size: 2em; font-weight: bold; color: #3498db; }
        .stat-label { color: #7f8c8d; margin-top: 5px; }
        .users-table { background: white; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th { background: #34495e; color: white; padding: 15px; text-align: left; }
        td { padding: 15px; border-bottom: 1px solid #ecf0f1; }
        .status-active { color: #27ae60; font-weight: bold; }
        .status-inactive { color: #e74c3c; }
        .plan-free { color: #95a5a6; }
        .plan-starter { color: #3498db; }
        .plan-pro { color: #9b59b6; }
        .plan-enterprise { color: #e67e22; }
        .plan-unlimited { color: #27ae60; }
        .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 3px; cursor: pointer; margin-bottom: 20px; }
        .chart-container { background: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .error { color: #e74c3c; padding: 10px; background: #fdf2f2; border-radius: 3px; margin: 10px 0; }
        .success { color: #27ae60; padding: 10px; background: #f2fdf2; border-radius: 3px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 n0de RPC Admin Dashboard</h1>
        <p>Real-time monitoring and user management</p>
    </div>

    <button class="refresh-btn" onclick="loadDashboard()">🔄 Refresh Data</button>

    <div class="stats" id="stats">
        <div class="stat-card">
            <div class="stat-value" id="totalUsers">-</div>
            <div class="stat-label">Active Users</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="totalRequests">-</div>
            <div class="stat-label">Total Requests</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="monthlyRevenue">-</div>
            <div class="stat-label">Monthly Revenue</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="profitMargin">-</div>
            <div class="stat-label">Profit vs Cost (€429)</div>
        </div>
    </div>

    <div class="chart-container">
        <h3>Revenue by Plan</h3>
        <canvas id="revenueChart" width="400" height="200"></canvas>
    </div>

    <div class="users-table">
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Plan</th>
                    <th>Requests Used</th>
                    <th>Monthly Limit</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Last Used</th>
                </tr>
            </thead>
            <tbody id="usersTableBody">
                <tr><td colspan="8" style="text-align: center; color: #7f8c8d;">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <script>
        let revenueChart;

        async function loadDashboard() {
            try {
                const [stats, users] = await Promise.all([
                    fetch('/api/stats').then(r => r.json()),
                    fetch('/api/users').then(r => r.json())
                ]);

                // Update stats
                document.getElementById('totalUsers').textContent = stats.total_users || 0;
                document.getElementById('totalRequests').textContent = (stats.total_requests || 0).toLocaleString();
                document.getElementById('monthlyRevenue').textContent = '€' + (stats.total_revenue || 0).toFixed(2);
                const profit = (stats.total_revenue || 0) - 429;
                document.getElementById('profitMargin').textContent = '€' + profit.toFixed(2);
                document.getElementById('profitMargin').style.color = profit > 0 ? '#27ae60' : '#e74c3c';

                // Update users table
                const tbody = document.getElementById('usersTableBody');
                tbody.innerHTML = '';

                users.forEach(user => {
                    const row = tbody.insertRow();
                    const requestsUsed = (user.requests_used || 0).toLocaleString();
                    const monthlyLimit = user.monthly_requests === -1 ? 'Unlimited' : (user.monthly_requests || 0).toLocaleString();
                    const lastUsed = user.last_used ? new Date(user.last_used).toLocaleDateString() : 'Never';
                    
                    row.innerHTML = \`
                        <td>\${user.name}</td>
                        <td>\${user.email}</td>
                        <td><span class="plan-\${user.plan_type}">\${user.plan_type}</span></td>
                        <td>\${requestsUsed}</td>
                        <td>\${monthlyLimit}</td>
                        <td>€\${(user.monthly_cost || 0).toFixed(2)}</td>
                        <td><span class="status-\${user.status}">\${user.status}</span></td>
                        <td>\${lastUsed}</td>
                    \`;
                });

                // Update revenue chart
                updateRevenueChart(stats.planBreakdown || []);

            } catch (error) {
                console.error('Error loading dashboard:', error);
                document.getElementById('usersTableBody').innerHTML = 
                    '<tr><td colspan="8" class="error">Error loading data. Please refresh.</td></tr>';
            }
        }

        function updateRevenueChart(planBreakdown) {
            const ctx = document.getElementById('revenueChart').getContext('2d');
            
            if (revenueChart) {
                revenueChart.destroy();
            }

            const labels = planBreakdown.map(p => p.plan_type);
            const data = planBreakdown.map(p => p.revenue);
            const colors = {
                'free': '#95a5a6',
                'starter': '#3498db',
                'pro': '#9b59b6',
                'enterprise': '#e67e22',
                'unlimited': '#27ae60'
            };

            revenueChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: labels.map(label => colors[label] || '#34495e'),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }

        // Load dashboard on page load
        loadDashboard();
        
        // Auto-refresh every 30 seconds
        setInterval(loadDashboard, 30000);
    </script>
</body>
</html>
`;

// Serve dashboard HTML
app.get('/', (req, res) => {
  res.send(dashboardHTML);
});

// API endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getUsageStats();
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.listUsers();
    res.json(users);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Start dashboard server
const PORT = 3002;
app.listen(PORT, '127.0.0.1', () => {
  console.log(chalk.green(`📊 Admin dashboard available at: http://127.0.0.1:${PORT}`));
  console.log(chalk.yellow('Note: Dashboard is only accessible from localhost for security'));
});

export default app;