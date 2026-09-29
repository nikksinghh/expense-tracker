import { useState, useEffect } from 'react';
import { BsArrowUpRight, BsArrowDownRight, BsPlusLg, BsCheckCircleFill, BsClock, BsCashStack } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate, getInitials } from '../utils/helpers';

const Settlement = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', paymentMethod: 'UPI', referenceNote: '' });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, histRes] = await Promise.allSettled([
        api.get('/api/settlements/status'),
        api.get('/api/settlements?limit=20')
      ]);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value.data);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data.settlements || []);
    } catch {
      toast('Failed to load settlement data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const calc = status?.calculation;
  const roommate = calc?.roommateDetails;

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast('Enter a valid amount', 'warning');
    if (!roommate?._id) return toast('No roommate found', 'error');
    setSaving(true);
    try {
      await api.post('/api/settlements', {
        receiver: calc?.relationship === 'you_owe_roommate' ? roommate._id : user._id,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        referenceNote: form.referenceNote
      });
      toast('Payment recorded successfully!', 'success', 'Settlement Done 🎉');
      setShowForm(false);
      setForm({ amount: '', paymentMethod: 'UPI', referenceNote: '' });
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Balance Card */}
      <div className="rm-card" style={{ marginBottom: 16 }}>
        {loading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
        ) : calc?.relationship === 'settled' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
            <h4 style={{ fontWeight: 800, color: 'var(--rm-green)', marginBottom: 6 }}>All Settled!</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              No pending dues between you and {roommate?.name?.split(' ')[0] || 'your roommate'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {calc?.relationship === 'you_owe_roommate' ? 'You Owe' : 'You Are Owed'}
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: calc?.relationship === 'you_owe_roommate' ? 'var(--rm-red)' : 'var(--rm-green)', lineHeight: 1 }}>
                {formatCurrency(calc?.netAmount || 0)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {roommate && (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rm-orange), #ffd166)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800 }}>
                      {getInitials(roommate.name)}
                    </div>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {calc?.relationship === 'you_owe_roommate' ? `to ${roommate.name}` : `from ${roommate.name}`}
                    </span>
                    {roommate.upiId && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• UPI: {roommate.upiId}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--rm-blue-pale)', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--rm-blue)', marginBottom: 2 }}>YOU PAID (shared)</div>
                  <div style={{ fontWeight: 800, color: 'var(--rm-blue)', fontSize: '1rem' }}>{formatCurrency(calc?.youPaid || 0)}</div>
                </div>
                <div style={{ background: 'rgba(132,94,194,0.1)', borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--rm-purple)', marginBottom: 2 }}>THEY PAID (shared)</div>
                  <div style={{ fontWeight: 800, color: 'var(--rm-purple)', fontSize: '1rem' }}>{formatCurrency(calc?.roommatePaid || 0)}</div>
                </div>
              </div>
            </div>

            <button
              className="btn-rm-primary"
              onClick={() => setShowForm(s => !s)}
              id="record-payment-btn"
              style={{ flexShrink: 0 }}
            >
              <BsPlusLg /> Record Payment
            </button>
          </div>
        )}
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="rm-card" style={{ marginBottom: 16, border: '2px solid var(--rm-green)', boxShadow: '0 0 0 4px rgba(34,197,94,0.08)' }}>
          <h5 style={{ fontWeight: 700, marginBottom: 16 }}>💸 Record Payment</h5>
          <form onSubmit={handleSettle}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="rm-form-label">Amount (₹) *</label>
                <input
                  type="number" min={1}
                  className="rm-input"
                  placeholder={calc?.netAmount || '0'}
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  id="settle-amount"
                />
                {calc?.netAmount && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, amount: calc.netAmount }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rm-blue)', fontSize: '0.72rem', fontWeight: 600, padding: '4px 0' }}>
                    Use full amount ({formatCurrency(calc.netAmount)})
                  </button>
                )}
              </div>
              <div>
                <label className="rm-form-label">Payment Method</label>
                <select className="rm-select" value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                  <option value="UPI">📱 UPI</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="rm-form-label">Reference / Note</label>
              <input className="rm-input" placeholder="e.g. Paid via GPay, ref: TXN123" value={form.referenceNote} onChange={e => setForm(f => ({ ...f, referenceNote: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-rm-outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-rm-primary" disabled={saving} style={{ flex: 2, justifyContent: 'center' }} id="confirm-settlement-btn">
                {saving ? <span className="spinner" /> : <><BsCheckCircleFill /> Confirm Payment</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* History */}
      <div className="rm-card">
        <h5 style={{ fontWeight: 700, marginBottom: 14 }}>Settlement History</h5>
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10, marginBottom: 8 }} />)
        ) : history.length === 0 ? (
          <div className="rm-empty-state">
            <div className="rm-empty-icon"><BsCashStack /></div>
            <h5>No settlements yet</h5>
            <p>Record your first payment to get started</p>
          </div>
        ) : (
          history.map(s => {
            const isPayer = s.payer?._id === user?._id;
            return (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: isPayer ? 'var(--rm-red-light)' : 'var(--rm-green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isPayer ? <BsArrowUpRight color="var(--rm-red)" size={18} /> : <BsArrowDownRight color="var(--rm-green)" size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.83rem' }}>
                    {isPayer ? `You paid ${s.receiver?.name?.split(' ')[0]}` : `${s.payer?.name?.split(' ')[0]} paid you`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BsClock size={10} /> {formatDate(s.createdAt)}
                    {s.paymentMethod && <span>• {s.paymentMethod}</span>}
                    {s.referenceNote && <span>• {s.referenceNote}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isPayer ? 'var(--rm-red)' : 'var(--rm-green)' }}>
                    {isPayer ? '-' : '+'}{formatCurrency(s.amount)}
                  </div>
                  <span className={`rm-badge-pill ${s.status === 'completed' ? 'rm-badge-success' : 'rm-badge-personal'}`} style={{ fontSize: '0.65rem' }}>
                    {s.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Settlement;
