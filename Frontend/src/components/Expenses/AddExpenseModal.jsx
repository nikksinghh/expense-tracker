import { useState, useEffect } from 'react';
import { BsX, BsPlus } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { CATEGORIES } from '../../utils/helpers';

const SPLIT_MODES = [
  { value: 'equal', label: '50/50 Equal Split' },
  { value: 'percentage', label: 'Percentage Split' },
  { value: 'custom', label: 'Custom Amount' }
];

const AddExpenseModal = ({ expense, onClose }) => {
  const { user, room } = useAuth();
  const toast = useToast();
  const isEdit = !!expense;

  const [form, setForm] = useState({
    title: expense?.title || '',
    amount: expense?.amount || '',
    category: expense?.category || 'Food',
    payer: expense?.payer?._id || expense?.paidBy?._id || expense?.payer || user?._id || '',
    type: expense?.type || 'shared',
    splitMode: expense?.splitMode || 'equal',
    note: expense?.note || '',
    date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  const [roommates, setRoomates] = useState([]);
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await api.get('/api/rooms/current');
        const members = res.data.room?.members || [];
        setRoomates(members);
        if (!form.payer && members.length > 0) {
          setForm(f => ({ ...f, payer: user?._id || members[0]._id }));
        }
        const splits = {};
        members.forEach(m => { splits[m._id] = ''; });
        setCustomSplits(splits);
      } catch { /* silent */ }
    };
    fetchMembers();
  }, [user?._id]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast('Title is required', 'warning');
    if (!form.amount || form.amount <= 0) return toast('Amount must be positive', 'warning');

    setLoading(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };

      if (form.type === 'shared' && form.splitMode !== 'equal') {
        const participants = roommates.map(m => ({
          user: m._id,
          shareAmount: Number(customSplits[m._id] || 0)
        }));
        payload.participants = participants;
      }

      if (isEdit) {
        await api.put(`/api/expenses/${expense._id}`, payload);
        toast('Expense updated!', 'success');
      } else {
        await api.post('/api/expenses', payload);
        toast('Expense added!', 'success');
      }
      onClose(true);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save expense', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalCustom = Object.values(customSplits).reduce((s, v) => s + (Number(v) || 0), 0);
  const amountNum = Number(form.amount) || 0;
  const splitWarning = form.splitMode === 'custom' && amountNum > 0 && Math.abs(totalCustom - amountNum) > 0.01;

  return (
    <div className="rm-modal-overlay" onClick={e => e.target === e.currentTarget && onClose(false)}>
      <div className="rm-modal">
        <div className="rm-modal-header">
          <h5>{isEdit ? '✏️ Edit Expense' : '➕ Add Expense'}</h5>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.3rem' }}>
            <BsX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rm-modal-body">
            {/* Title & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="rm-form-label">Title *</label>
                <input className="rm-input" placeholder="e.g. Room Rent" value={form.title} onChange={e => setField('title', e.target.value)} id="exp-title" />
              </div>
              <div>
                <label className="rm-form-label">Amount (₹) *</label>
                <input type="number" min={1} className="rm-input" placeholder="1500" value={form.amount} onChange={e => setField('amount', e.target.value)} id="exp-amount" />
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <label className="rm-form-label">Category</label>
              <select className="rm-select" value={form.category} onChange={e => setField('category', e.target.value)} id="exp-category">
                {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.emoji} {c.label}</option>)}
              </select>
            </div>

            {/* Paid By & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="rm-form-label">Paid By (Who Paid?) *</label>
                <select
                  className="rm-select"
                  value={form.payer}
                  onChange={e => setField('payer', e.target.value)}
                  id="exp-payer"
                >
                  {roommates.map(m => (
                    <option key={m._id} value={m._id}>
                      {m._id === user?._id ? '👤 You (' + m.name + ')' : '👥 ' + m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rm-form-label">Date</label>
                <input type="date" className="rm-input" value={form.date} onChange={e => setField('date', e.target.value)} id="exp-date" />
              </div>
            </div>

            {/* Type */}
            <div style={{ marginBottom: 12 }}>
              <label className="rm-form-label">Expense Type</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {['shared', 'personal'].map(t => (
                  <button
                    key={t} type="button"
                    onClick={() => setField('type', t)}
                    className={`rm-chip ${form.type === t ? 'active' : ''}`}
                    style={{ flex: 1, textAlign: 'center', borderRadius: 10 }}
                  >
                    {t === 'shared' ? '👥 Shared (Split)' : '👤 Personal (Only Me)'}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
                {form.type === 'shared'
                  ? `Split between all ${roommates.length || 2} roommates in room`
                  : 'Only counted as your personal expense (not included in settlement)'}
              </p>
            </div>

            {/* Split Mode (only for shared) */}
            {form.type === 'shared' && (
              <div style={{ marginBottom: 12 }}>
                <label className="rm-form-label">Split Mode</label>
                <select className="rm-select" value={form.splitMode} onChange={e => setField('splitMode', e.target.value)} id="exp-split-mode">
                  {SPLIT_MODES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                {form.splitMode === 'equal' && roommates.length > 0 && amountNum > 0 && (
                  <div style={{ marginTop: 8, background: 'var(--rm-blue-pale)', borderRadius: 10, padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    📊 Each member's share: <strong style={{ color: 'var(--rm-blue)' }}>₹{(amountNum / Math.max(roommates.length, 1)).toFixed(2)}</strong> across {roommates.length} roommates ({roommates.map(m => m._id === user?._id ? 'You' : m.name.split(' ')[0]).join(', ')})
                  </div>
                )}

                {form.splitMode !== 'equal' && roommates.length > 0 && (
                  <div style={{ marginTop: 10, background: 'var(--bg-input)', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Set {form.splitMode === 'percentage' ? 'percentage' : 'amount'} for each member:
                    </div>
                    {roommates.map(m => (
                      <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--rm-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {m.name?.[0]}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500 }}>
                          {m._id === user?._id ? 'You' : m.name}
                        </span>
                        <div style={{ position: 'relative', width: 110 }}>
                          <input
                            type="number" min={0}
                            className="rm-input"
                            style={{ paddingRight: 28, textAlign: 'right' }}
                            placeholder={form.splitMode === 'percentage' ? '50' : '0'}
                            value={customSplits[m._id]}
                            onChange={e => setCustomSplits(s => ({ ...s, [m._id]: e.target.value }))}
                          />
                          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {form.splitMode === 'percentage' ? '%' : '₹'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {splitWarning && (
                      <div style={{ background: 'var(--rm-orange-light)', borderRadius: 8, padding: '6px 10px', fontSize: '0.73rem', color: 'var(--rm-orange)', fontWeight: 600 }}>
                        ⚠️ Total {form.splitMode === 'custom' ? `₹${totalCustom}` : `${totalCustom}%`} ≠ {form.splitMode === 'custom' ? `₹${amountNum}` : '100%'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="rm-form-label">Note (optional)</label>
              <input className="rm-input" placeholder="Add a description..." value={form.note} onChange={e => setField('note', e.target.value)} id="exp-note" />
            </div>
          </div>

          <div className="rm-modal-footer">
            <button type="button" className="btn-rm-outline" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn-rm-primary" disabled={loading} id="save-expense-btn">
              {loading ? <span className="spinner" /> : isEdit ? 'Save Changes' : <><BsPlus /> Add Expense</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
