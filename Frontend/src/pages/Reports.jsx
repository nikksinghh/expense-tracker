import { useState, useEffect } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useMonth } from '../contexts/MonthContext';
import api from '../api/axios';
import { formatCurrency, getCategoryMeta, CHART_COLORS } from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement, Filler);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Reports = ({ selectedMonth: selectedMonthProp }) => {
  const { user } = useAuth();
  const toast = useToast();
  const monthCtx = useMonth();
  const selectedMonth = selectedMonthProp || monthCtx?.selectedMonth;

  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const month = selectedMonth?.month || (new Date().getMonth() + 1);
  const year = selectedMonth?.year || new Date().getFullYear();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [catRes, trendRes, statsRes] = await Promise.allSettled([
          api.get(`/api/expenses/categories?month=${month}&year=${year}`),
          api.get('/api/expenses/trend?months=6'),
          api.get(`/api/expenses/stats?month=${month}&year=${year}`)
        ]);

        if (catRes.status === 'fulfilled') setCategoryBreakdown(catRes.value.data.breakdown || []);
        if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.trend || []);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      } catch {
        toast('Failed to load reports', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [month, year]);

  const doughnutData = {
    labels: categoryBreakdown.map(c => c.category),
    datasets: [{
      data: categoryBreakdown.map(c => c.total),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
      hoverOffset: 12
    }]
  };

  const lineData = {
    labels: trend.map(t => MONTHS[t.month - 1]),
    datasets: [
      {
        label: 'You',
        data: trend.map(t => t.yourShare || 0),
        borderColor: '#1d72fe',
        backgroundColor: 'rgba(29,114,254,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#1d72fe'
      },
      {
        label: 'Roommate',
        data: trend.map(t => t.roommateShare || 0),
        borderColor: '#845ec2',
        backgroundColor: 'rgba(132,94,194,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#845ec2'
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 11 }, color: 'var(--text-secondary)', boxWidth: 12 } },
      tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toLocaleString('en-IN')}` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
      y: {
        grid: { color: 'var(--divider)' },
        ticks: { color: 'var(--text-muted)', font: { size: 11 }, callback: v => `₹${v >= 1000 ? (v / 1000) + 'k' : v}` }
      }
    }
  };

  const barCatData = {
    labels: categoryBreakdown.map(c => c.category),
    datasets: [{
      label: 'Amount (₹)',
      data: categoryBreakdown.map(c => c.total),
      backgroundColor: CHART_COLORS,
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const barCatOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toLocaleString('en-IN')}` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { size: 11 } } },
      y: { grid: { color: 'var(--divider)' }, ticks: { color: 'var(--text-muted)', font: { size: 11 }, callback: v => `₹${v >= 1000 ? (v / 1000) + 'k' : v}` } }
    }
  };

  const totalSpent = categoryBreakdown.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      {/* Tabs */}
      <div className="rm-tabs" style={{ maxWidth: 340, marginBottom: 20 }}>
        {[['overview', '📊 Overview'], ['trend', '📈 Trend'], ['categories', '🏷️ Categories']].map(([k, l]) => (
          <button key={k} className={`rm-tab ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Summary */}
          <div className="rm-grid-3" style={{ marginBottom: 16 }}>
            {[
              { label: 'Total Spent', value: formatCurrency(stats?.totalAmount || 0), color: 'var(--rm-blue)', icon: '💰' },
              { label: 'Your Share', value: formatCurrency(stats?.yourShare || 0), color: 'var(--rm-blue)', icon: '👤' },
              { label: 'Transactions', value: stats?.count || 0, color: 'var(--rm-purple)', icon: '🧾' }
            ].map(item => (
              <div key={item.label} className="rm-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color }}>{loading ? '...' : item.value}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="rm-grid-1-1">
            <div className="rm-card">
              <h5 style={{ fontWeight: 700, marginBottom: 12 }}>Category Distribution</h5>
              <div style={{ height: 240 }}>
                {categoryBreakdown.length > 0 ? (
                  <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, color: 'var(--text-secondary)', boxWidth: 8, padding: 8 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` } } } }} />
                ) : (
                  <div className="rm-empty-state" style={{ paddingTop: 60 }}><p>No data for this month</p></div>
                )}
              </div>
            </div>

            <div className="rm-card">
              <h5 style={{ fontWeight: 700, marginBottom: 12 }}>Top Categories</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading ? [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 10 }} />) :
                  categoryBreakdown.slice(0, 5).map((cat, i) => {
                    const meta = getCategoryMeta(cat.category);
                    const pct = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0;
                    return (
                      <div key={cat.category}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span>{meta.emoji}</span>
                          <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600 }}>{cat.category}</span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--rm-blue)' }}>{formatCurrency(cat.total)}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{pct}%</span>
                        </div>
                        <div className="rm-progress">
                          <div className="rm-progress-bar normal" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'trend' && (
        <div className="rm-card">
          <h5 style={{ fontWeight: 700, marginBottom: 16 }}>6-Month Expense Trend</h5>
          <div style={{ height: 300 }}>
            {trend.length > 0 ? (
              <Line data={lineData} options={lineOptions} />
            ) : (
              <div className="rm-empty-state" style={{ paddingTop: 80 }}><p>No trend data available</p></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="rm-card">
          <h5 style={{ fontWeight: 700, marginBottom: 16 }}>Spending by Category — {MONTHS[month - 1]} {year}</h5>
          <div style={{ height: 300 }}>
            {categoryBreakdown.length > 0 ? (
              <Bar data={barCatData} options={barCatOptions} />
            ) : (
              <div className="rm-empty-state" style={{ paddingTop: 80 }}><p>No data for this month</p></div>
            )}
          </div>

          {/* Category detail list */}
          <div style={{ marginTop: 20, borderTop: '1px solid var(--divider)', paddingTop: 16 }}>
            {categoryBreakdown.map((cat, i) => {
              const meta = getCategoryMeta(cat.category);
              const pct = totalSpent > 0 ? Math.round((cat.total / totalSpent) * 100) : 0;
              return (
                <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                  <span style={{ fontSize: '1.1rem' }}>{meta.emoji}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.83rem' }}>{cat.category}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 8 }}>{cat.count} transactions</span>
                  <span style={{ fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length], fontSize: '0.9rem' }}>{formatCurrency(cat.total)}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
