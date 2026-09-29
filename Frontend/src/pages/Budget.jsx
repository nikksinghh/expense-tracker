import { useState, useEffect } from 'react';
import { BsPencilFill, BsWalletFill, BsBellFill } from 'react-icons/bs';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency } from '../utils/helpers';

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const Budget = ({ selectedMonth }) => {
  const toast = useToast();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ monthlyLimit: '', thresholds: [75, 90, 100] });
  const [saving, setSaving] = useState(false);

  const month = selectedMonth?.month || (new Date().getMonth() + 1);
  const year = selectedMonth?.year || new Date().getFullYear();

  const fetchBudget = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/budgets?month=${month}&year=${year}`);
      setBudget(res.data);
      setForm({ monthlyLimit: res.data.monthlyLimit || '', thresholds: res.data.thresholds || [75, 90, 100] });
    } catch {
      setBudget(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudget(); }, [month, year]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.monthlyLimit || form.monthlyLimit <= 0) return toast('Enter a valid budget limit', 'warning');
    setSaving(true);
    try {
      await api.post('/api/budgets', { month, year, monthlyLimit: Number(form.monthlyLimit), thresholds: form.thresholds });
      toast('Budget saved!', 'success');
      setShowForm(false);
      fetchBudget();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save budget', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalSpent = budget?.totalSpending || 0;
  const limit = budget?.monthlyLimit || 0;
  const pct = limit > 0 ? Math.min(Math.round((totalSpent / limit) * 100), 100) : 0;
  const remaining = Math.max(limit - totalSpent, 0);
  const status = pct >= 100 ? 'critical' : pct >= 90 ? 'warning' : pct >= 75 ? 'warning' : 'normal';
  const statusColor = pct >= 100 ? 'var(--rm-red)' : pct >= 75 ? 'var(--rm-orange)' : 'var(--rm-green)';
  const statusLabel = pct >= 100 ? 'Over Budget!' : pct >= 90 ? 'Critical!' : pct >= 75 ? 'Warning' : 'On Track';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h4 style={{ margin: 0, fontWeight: 800 }}>Monthly Budget</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {MONTHS_FULL[month - 1]} {year}
          </p>
        </div>
        <button className="btn-rm-primary" onClick={() => setShowForm(s => !s)} id="set-budget-btn">
          <BsPencilFill size={12} /> {budget?.monthlyLimit ? 'Edit Budget' : 'Set Budget'}
        </button>
      </div>

      {/* Set Budget Form */}
      {showForm && (
        <div className="rm-card" style={{ marginBottom: 16, border: '2px solid var(--rm-blue)', boxShadow: '0 0 0 4px rgba(29,114,254,0.08)' }}>
          <h5 style={{ fontWeight: 700, marginBottom: 16 }}>
            {budget?.monthlyLimit ? '✏️ Update' : '➕ Set'} Budget for {MONTHS_FULL[month - 1]} {year}
          </h5>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label className="rm-form-label">Monthly Limit (₹) *</label>
                <input
                  type="number" min={1}
                  className="rm-input"
                  placeholder="e.g. 15000"
                  value={form.monthlyLimit}
                  onChange={e => setForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                  id="budget-limit-input"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ background: 'var(--rm-blue-pale)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>DAILY LIMIT</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--rm-blue)' }}>
                    {form.monthlyLimit ? formatCurrency(Math.round(form.monthlyLimit / 30)) : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="rm-form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BsBellFill size={11} /> Alert Thresholds (%)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[75, 90, 100].map(t => (
                  <div key={t} style={{ flex: 1, background: 'var(--bg-input)', borderRadius: 10, padding: '8px', textAlign: 'center', cursor: 'pointer', border: form.thresholds.includes(t) ? '2px solid var(--rm-blue)' : '2px solid transparent', transition: 'border 0.2s' }}
                    onClick={() => setForm(f => ({
                      ...f,
                      thresholds: f.thresholds.includes(t) ? f.thresholds.filter(x => x !== t) : [...f.thresholds, t].sort()
                    }))}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: t >= 100 ? 'var(--rm-red)' : t >= 90 ? 'var(--rm-orange)' : 'var(--rm-green)' }}>{t}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{form.thresholds.includes(t) ? '✓ On' : 'Off'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-rm-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-rm-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }} id="save-budget-btn">
                {saving ? <span className="spinner" /> : 'Save Budget'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rm-card">
          <div className="skeleton" style={{ height: 180, borderRadius: 12 }} />
        </div>
      ) : !budget?.monthlyLimit ? (
        <div className="rm-card">
          <div className="rm-empty-state">
            <div className="rm-empty-icon" style={{ fontSize: '2rem' }}><BsWalletFill /></div>
            <h5>No budget set</h5>
            <p>Set a monthly budget to track your spending and get alerts</p>
            <button className="btn-rm-primary" style={{ margin: '12px auto 0', display: 'flex' }} onClick={() => setShowForm(true)}>
              Set Budget Now
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main Progress Card */}
          <div className="rm-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Spent This Month</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {formatCurrency(totalSpent)}
                  <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>/ {formatCurrency(limit)}</span>
                </div>
              </div>
              <div style={{ background: pct >= 100 ? 'var(--rm-red-light)' : pct >= 75 ? 'var(--rm-orange-light)' : 'var(--rm-green-light)', borderRadius: 12, padding: '10px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: statusColor }}>{pct}%</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor }}>{statusLabel}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="rm-progress" style={{ height: 14, marginBottom: 12 }}>
              <div className={`rm-progress-bar ${status}`} style={{ width: `${pct}%` }} />
            </div>

            {/* Threshold markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              <span>₹0</span>
              {(budget.thresholds || []).map(t => (
                <span key={t} style={{ color: t >= 100 ? 'var(--rm-red)' : t >= 90 ? 'var(--rm-orange)' : 'var(--rm-green)', fontWeight: 700 }}>
                  {t}%
                </span>
              ))}
              <span>{formatCurrency(limit)}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                { label: 'Remaining', value: formatCurrency(remaining), color: remaining === 0 ? 'var(--rm-red)' : 'var(--rm-green)' },
                { label: 'Daily Budget Left', value: remaining > 0 ? formatCurrency(Math.round(remaining / Math.max(new Date(year, month, 0).getDate() - new Date().getDate(), 1))) : '₹0', color: 'var(--rm-blue)' },
                { label: 'Used', value: `${pct}%`, color: statusColor }
              ].map(item => (
                <div key={item.label} style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Threshold Status */}
          <div className="rm-card">
            <h5 style={{ fontWeight: 700, marginBottom: 14 }}>Alert Status</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(budget.thresholds || [75, 90, 100]).map(t => {
                const reached = pct >= t;
                const tColor = t >= 100 ? 'var(--rm-red)' : t >= 90 ? 'var(--rm-orange)' : 'var(--rm-green)';
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: reached ? (t >= 100 ? 'var(--rm-red-light)' : t >= 90 ? 'var(--rm-orange-light)' : 'var(--rm-green-light)') : 'var(--bg-input)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: reached ? tColor : 'var(--border-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {reached ? '🔔' : '⭕'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.83rem', color: reached ? tColor : 'var(--text-primary)' }}>
                        {t}% Budget {reached ? 'Reached' : 'Alert'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        at {formatCurrency(Math.round(limit * t / 100))}
                      </div>
                    </div>
                    <span className={`rm-badge-pill ${reached ? 'rm-badge-danger' : 'rm-badge-success'}`}>
                      {reached ? '⚠️ Triggered' : '✓ Not yet'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Budget;
