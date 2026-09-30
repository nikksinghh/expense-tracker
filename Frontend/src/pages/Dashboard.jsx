import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import {
  BsArrowUpRight, BsArrowDownRight, BsPlusLg, BsArrowRight,
  BsCashStack, BsPersonFill, BsPeopleFill, BsWalletFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useMonth } from '../contexts/MonthContext';
import api from '../api/axios';
import {
  formatCurrency, formatDateShort, getCategoryMeta,
  getGreeting, CHART_COLORS
} from '../utils/helpers';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = ({ selectedMonth: selectedMonthProp }) => {
  const { user, room } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const monthCtx = useMonth();
  const selectedMonth = selectedMonthProp || monthCtx?.selectedMonth;

  const [stats, setStats] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [budget, setBudget] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  const month = selectedMonth?.month || (new Date().getMonth() + 1);
  const year = selectedMonth?.year || new Date().getFullYear();


  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    if (!room) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, expRes, settleRes, budgetRes, trendRes, catRes] = await Promise.allSettled([
          api.get(`/api/expenses/stats?month=${month}&year=${year}`),
          api.get(`/api/expenses?limit=5&month=${month}&year=${year}`),
          api.get('/api/settlements/status'),
          api.get(`/api/budgets?month=${month}&year=${year}`),
          api.get(`/api/expenses/trend?months=6`),
          api.get(`/api/expenses/categories?month=${month}&year=${year}`)
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (expRes.status === 'fulfilled') setRecentExpenses(expRes.value.data.expenses || []);
        if (settleRes.status === 'fulfilled') setSettlement(settleRes.value.data);
        if (budgetRes.status === 'fulfilled') setBudget(budgetRes.value.data);
        if (trendRes.status === 'fulfilled') setMonthlyTrend(trendRes.value.data.trend || []);
        if (catRes.status === 'fulfilled') setCategoryBreakdown(catRes.value.data.breakdown || []);
      } catch {
        toast('Failed to load dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [room, month, year]);

  if (!room) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="rm-card" style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
          <div className="rm-empty-icon" style={{ margin: '0 auto 16px' }}>🏠</div>
          <h5 style={{ fontWeight: 700, marginBottom: 8 }}>No room yet!</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
            Create or join a room to start tracking shared expenses with your roommate.
          </p>
          <button className="btn-rm-primary" onClick={() => navigate('/room-setup')} style={{ margin: '0 auto' }}>
            Set Up Room <BsArrowRight />
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = stats?.totalAmount || 0;
  const yourShare = stats?.yourShare || 0;
  const roommateShare = stats?.roommateShare || 0;
  const budgetPct = (budget && budget.monthlyLimit > 0)
    ? Math.min(Math.round(((budget.totalSpending || 0) / budget.monthlyLimit) * 100), 100)
    : 0;

  // Bar chart data — monthly trend
  const barData = {
    labels: monthlyTrend.map(t => MONTHS[(t.month - 1)]),
    datasets: [
      {
        label: 'Your Share',
        data: monthlyTrend.map(t => t.yourShare || 0),
        backgroundColor: 'rgba(29,114,254,0.85)',
        borderRadius: 6,
        borderSkipped: false
      },
      {
        label: 'Roommate Share',
        data: monthlyTrend.map(t => t.roommateShare || 0),
        backgroundColor: 'rgba(132,94,194,0.75)',
        borderRadius: 6,
        borderSkipped: false
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 11, family: 'Inter' }, color: 'var(--text-secondary)', boxWidth: 12 } },
      tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toLocaleString('en-IN')}` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: 'var(--text-muted)' } },
      y: {
        grid: { color: 'var(--divider)', drawBorder: false },
        ticks: { font: { size: 11 }, color: 'var(--text-muted)', callback: v => `₹${v >= 1000 ? (v / 1000) + 'k' : v}` }
      }
    }
  };

  // Doughnut chart data
  const doughnutData = {
    labels: categoryBreakdown.map(c => c.category),
    datasets: [{
      data: categoryBreakdown.map(c => c.total),
      backgroundColor: CHART_COLORS,
      borderWidth: 0,
      hoverOffset: 8
    }]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter' }, color: 'var(--text-secondary)', boxWidth: 10, padding: 10 } },
      tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}` } }
    }
  };

  const settleCalc = settlement?.calculation;
  const otherRoommate = room?.members?.find(m => m._id !== user?._id);

  return (
    <div>
      {/* Greeting & Room Status Banner */}
      <div className="rm-card rm-greeting-banner" style={{
        padding: '16px 18px',
        marginBottom: 16,
        borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(29, 114, 254, 0.08) 0%, rgba(29, 114, 254, 0.02) 100%)',
        border: '1px solid var(--border-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
              {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '3px 0 0' }}>
              {MONTHS[month - 1]} {year} • <strong style={{ color: 'var(--rm-blue)' }}>{room?.name || 'My Room'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: 'auto' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '6px 12px',
              borderRadius: 10,
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Code:</span>
              <strong style={{ color: 'var(--rm-blue)', letterSpacing: '0.5px' }}>{room?.code}</strong>
            </div>

            {otherRoommate ? (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--rm-green)'
              }}>
                👥 {otherRoommate.name?.split(' ')[0]}
              </div>
            ) : (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => navigate('/members')}
                style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 10, fontWeight: 600 }}
              >
                + Invite Roommate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon"><BsCashStack /></div>
          <div className="card-label">Total Spent</div>
          <div className="card-value">{loading ? '...' : formatCurrency(totalSpent)}</div>
          <div className="card-sub">This month</div>
        </div>

        <div className="summary-card yours">
          <div className="card-icon"><BsPersonFill /></div>
          <div className="card-label">Your Share</div>
          <div className="card-value">{loading ? '...' : formatCurrency(yourShare)}</div>
          <div className="card-sub">Of shared expenses</div>
        </div>

        <div className="summary-card roommate">
          <div className="card-icon"><BsPeopleFill /></div>
          <div className="card-label">Roommate's Share</div>
          <div className="card-value">{loading ? '...' : formatCurrency(roommateShare)}</div>
          <div className="card-sub">Pending settlement</div>
        </div>

        <div className="summary-card budget">
          <div className="card-icon"><BsWalletFill /></div>
          <div className="card-label">Budget Used</div>
          <div className="card-value">{loading ? '...' : `${budgetPct}%`}</div>
          <div className="card-sub">
            {budget ? `${formatCurrency(budget.remaining)} remaining` : 'No budget set'}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="rm-grid-2-1" style={{ marginBottom: 16 }}>
        {/* Bar Chart */}
        <div className="rm-card">
          <div className="section-header">
            <h5>Monthly Expense Trend</h5>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 6 months</span>
          </div>
          <div style={{ height: 220 }}>
            {monthlyTrend.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div className="rm-empty-state" style={{ paddingTop: 60 }}>
                <p>No expense data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="rm-card">
          <div className="section-header">
            <h5>By Category</h5>
          </div>
          <div style={{ height: 220 }}>
            {categoryBreakdown.length > 0 ? (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            ) : (
              <div className="rm-empty-state" style={{ paddingTop: 60 }}>
                <p>No data for this month</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="rm-grid-2-1">
        {/* Recent Expenses */}
        <div className="rm-card">
          <div className="section-header">
            <h5>Recent Expenses</h5>
            <button className="view-all-btn" onClick={() => navigate('/expenses')}>
              View all <BsArrowRight size={12} />
            </button>
          </div>

          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--divider)', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%' }} />
                </div>
                <div className="skeleton" style={{ height: 14, width: 60 }} />
              </div>
            ))
          ) : recentExpenses.length === 0 ? (
            <div className="rm-empty-state">
              <div className="rm-empty-icon" style={{ fontSize: '1.5rem' }}>🧾</div>
              <h5>No expenses yet</h5>
              <p>Add your first expense to get started</p>
              <button className="btn-rm-primary" style={{ margin: '12px auto 0', display: 'flex' }} onClick={() => navigate('/add-expense')}>
                <BsPlusLg /> Add Expense
              </button>
            </div>
          ) : (
            recentExpenses.map(exp => {
              const meta = getCategoryMeta(exp.category);
              const isYours = exp.paidBy?._id === user?._id;
              return (
                <div key={exp._id} className="expense-item" onClick={() => navigate('/expenses')}>
                  <div className={`expense-cat-icon ${meta.colorClass}`}>{meta.emoji}</div>
                  <div className="expense-info">
                    <h6>{exp.title}</h6>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`payer-badge ${!isYours ? 'roommate' : ''}`}>
                        {isYours ? 'You' : exp.paidBy?.name?.split(' ')[0] || 'Roommate'}
                      </span>
                      <span className={`rm-badge-pill ${exp.type === 'shared' ? 'rm-badge-shared' : 'rm-badge-personal'}`} style={{ fontSize: '0.65rem' }}>
                        {exp.type}
                      </span>
                    </div>
                  </div>
                  <div className="expense-meta">
                    <div className="amount">- {formatCurrency(exp.amount)}</div>
                    <div className="date">{formatDateShort(exp.date || exp.createdAt)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Settlement Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="rm-card">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <h5>Settlement</h5>
              <button className="view-all-btn" onClick={() => navigate('/settlement')}>
                Details <BsArrowRight size={12} />
              </button>
            </div>

            {settleCalc ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  {settleCalc.relationship === 'settled' ? (
                    <>
                      <div style={{ fontSize: '2.5rem', marginBottom: 4 }}>✅</div>
                      <div style={{ fontWeight: 700, color: 'var(--rm-green)', fontSize: '0.9rem' }}>All settled!</div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>No pending dues</p>
                    </>
                  ) : (
                    <>
                      <div className="settlement-amount">{formatCurrency(settleCalc.netAmount)}</div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 8px' }}>
                        {settleCalc.relationship === 'you_owe_roommate'
                          ? `You owe ${settleCalc.roommateDetails?.name?.split(' ')[0] || 'roommate'}`
                          : `${settleCalc.roommateDetails?.name?.split(' ')[0] || 'Roommate'} owes you`}
                      </p>
                      <span className={`rm-badge-pill ${settleCalc.relationship === 'you_owe_roommate' ? 'rm-badge-danger' : 'rm-badge-success'}`}>
                        {settleCalc.relationship === 'you_owe_roommate' ? <BsArrowUpRight /> : <BsArrowDownRight />}
                        {settleCalc.relationship === 'you_owe_roommate' ? ' You Owe' : ' They Owe'}
                      </span>
                    </>
                  )}
                </div>
                <button className="btn-rm-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/settlement')}>
                  Record Payment
                </button>
              </>
            ) : (
              <div className="rm-empty-state" style={{ padding: '16px 0' }}>
                <p>No settlement data</p>
              </div>
            )}
          </div>

          {/* Budget Quick View */}
          {budget && (
            <div className="rm-card">
              <div className="section-header" style={{ marginBottom: 10 }}>
                <h5>Budget Status</h5>
                <span style={{ fontSize: '0.72rem', color: budgetPct >= 90 ? 'var(--rm-red)' : budgetPct >= 75 ? 'var(--rm-orange)' : 'var(--rm-green)', fontWeight: 700 }}>
                  {budgetPct}%
                </span>
              </div>
              <div className="rm-progress">
                <div className={`rm-progress-bar ${budgetPct >= 100 ? 'critical' : budgetPct >= 75 ? 'warning' : 'normal'}`}
                  style={{ width: `${budgetPct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
                <span>Spent: {formatCurrency(budget.totalSpending)}</span>
                <span>Limit: {formatCurrency(budget.monthlyLimit)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
