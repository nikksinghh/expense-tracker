import { useState, useEffect } from 'react';
import { BsCopy, BsPeopleFill, BsPersonFill, BsChevronDown, BsChevronUp } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate, getInitials, getCategoryMeta } from '../utils/helpers';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#1d72fe,#845ec2)',
  'linear-gradient(135deg,#f97316,#ffd166)',
  'linear-gradient(135deg,#22c55e,#00c9a7)',
  'linear-gradient(135deg,#ff6b8b,#845ec2)',
  'linear-gradient(135deg,#06b6d4,#1d72fe)'
];

const MemberCard = ({ member, isMe, colorIdx, expenses, settlement, membersCount }) => {
  const [expanded, setExpanded] = useState(false);
  const memberExpenses = expenses.filter(e => (e.paidBy?._id || e.payer?._id || e.paidBy || e.payer) === member._id ||
    (e.paidBy?._id || e.payer?._id || e.paidBy || e.payer)?.toString() === member._id?.toString()
  );
  const totalPaid = memberExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalShare = memberExpenses.filter(e => e.type === 'shared').reduce((s, e) => s + (e.amount || 0) / Math.max(membersCount, 2), 0);

  return (
    <div className="rm-card" style={{ marginBottom: 12 }}>
      {/* Clickable header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: AVATAR_COLORS[colorIdx % AVATAR_COLORS.length],
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', fontWeight: 800,
          boxShadow: `0 4px 14px rgba(29,114,254,0.25)`, flexShrink: 0
        }}>
          {getInitials(member.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</h5>
            {isMe && <span className="rm-badge-pill rm-badge-shared" style={{ fontSize: '0.6rem' }}>You</span>}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{member.email}</div>
          {member.upiId && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>💳 {member.upiId}</div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--rm-blue)' }}>{formatCurrency(totalPaid)}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total paid</div>
        </div>
        <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <BsChevronUp /> : <BsChevronDown />}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 14 }}>
        {[
          { label: 'Paid', value: formatCurrency(totalPaid), color: 'var(--rm-blue)' },
          { label: 'Expenses', value: memberExpenses.length, color: 'var(--rm-purple)' },
          { label: 'Share', value: formatCurrency(totalShare), color: 'var(--rm-green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-input)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Expanded expense list */}
      {expanded && (
        <div style={{ marginTop: 14, borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10, color: 'var(--text-secondary)' }}>
            Recent Expenses by {isMe ? 'You' : member.name?.split(' ')[0]}
          </div>
          {memberExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No expenses yet
            </div>
          ) : (
            memberExpenses.slice(0, 8).map(exp => {
              const meta = getCategoryMeta(exp.category);
              return (
                <div key={exp._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                  <div className={`expense-cat-icon ${meta.colorClass}`} style={{ width: 32, height: 32, borderRadius: 8, fontSize: '0.9rem' }}>{meta.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {exp.category} • {formatDate(exp.date || exp.createdAt)}
                      {exp.type === 'shared' && <span style={{ color: 'var(--rm-blue)', marginLeft: 4 }}>• Shared</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--rm-red)', fontSize: '0.85rem', flexShrink: 0 }}>
                    {formatCurrency(exp.amount)}
                  </div>
                </div>
              );
            })
          )}
          {memberExpenses.length > 8 && (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
              +{memberExpenses.length - 8} more expenses
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Members = () => {
  const { user, room } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState([]);
  const [balances, setBalances] = useState({});
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!room) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [memRes, settleRes, actRes] = await Promise.allSettled([
          api.get('/api/rooms/current'),
          api.get('/api/settlements/status'),
          api.get('/api/expenses?limit=50')
        ]);
        if (memRes.status === 'fulfilled') setMembers(memRes.value.data.room?.members || []);
        if (settleRes.status === 'fulfilled') setBalances(settleRes.value.data?.calculation || {});
        if (actRes.status === 'fulfilled') setActivity(actRes.value.data?.expenses || []);
      } catch {
        toast('Failed to load member data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [room]);

  const copyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
    toast(`Code ${room?.code} copied!`, 'success');
  };

  if (!room) {
    return (
      <div className="rm-empty-state" style={{ paddingTop: 80 }}>
        <div className="rm-empty-icon">🏠</div>
        <h5>No room yet</h5>
        <p>Set up a room to see member details</p>
      </div>
    );
  }

  const myTotal = activity.filter(e => {
    const payerId = e.paidBy?._id || e.payer?._id || e.paidBy || e.payer;
    return payerId?.toString() === user?._id?.toString();
  }).reduce((s, e) => s + (e.amount || 0), 0);

  const theirTotal = activity.filter(e => {
    const payerId = e.paidBy?._id || e.payer?._id || e.paidBy || e.payer;
    return payerId?.toString() !== user?._id?.toString();
  }).reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      {/* Room Info Card */}
      <div className="rm-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 800 }}>🏠 {room.name}</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} • Created {new Date(room.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--rm-blue-pale)', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Invite Code</div>
              <div style={{ fontWeight: 800, color: 'var(--rm-blue)', letterSpacing: 2, fontSize: '1rem' }}>{room.code}</div>
            </div>
            <button className="btn-rm-outline" onClick={copyCode} style={{ gap: 6 }}>
              <BsCopy size={12} /> Copy Code
            </button>
          </div>
        </div>

        {/* Payment comparison bar */}
        {(myTotal > 0 || theirTotal > 0) && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--divider)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>You paid: <strong style={{ color: 'var(--rm-blue)' }}>{formatCurrency(myTotal)}</strong></span>
              <span>Others paid: <strong style={{ color: 'var(--rm-purple)' }}>{formatCurrency(theirTotal)}</strong></span>
            </div>
            <div style={{ height: 10, background: 'var(--divider)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${myTotal / Math.max(myTotal + theirTotal, 1) * 100}%`, background: 'linear-gradient(90deg, var(--rm-blue), var(--rm-blue-light))', transition: 'width 0.6s ease' }} />
              <div style={{ flex: 1, background: 'linear-gradient(90deg, var(--rm-purple), #a78bfa)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Balance card */}
      {balances.netAmount !== undefined && (
        <div className="rm-card" style={{ marginBottom: 16, textAlign: 'center', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Current Balance</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: balances.relationship === 'settled' ? 'var(--rm-green)' : balances.relationship === 'you_owe_roommate' ? 'var(--rm-red)' : 'var(--rm-green)' }}>
            {balances.relationship === 'settled' ? '✅ All Settled!' : formatCurrency(balances.netAmount)}
          </div>
          {balances.relationship !== 'settled' && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {balances.relationship === 'you_owe_roommate' ? `You owe ${members.find(m => m._id !== user?._id)?.name?.split(' ')[0] || 'roommate'}` : `${members.find(m => m._id !== user?._id)?.name?.split(' ')[0] || 'Roommate'} owes you`}
            </div>
          )}
        </div>
      )}

      {/* Member cards — click to expand expense details */}
      <div style={{ marginBottom: 8 }}>
        <h5 style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BsPeopleFill color="var(--rm-blue)" /> Members
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>Click a card to see expense details</span>
        </h5>
      </div>

      {loading ? (
        [...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 18, marginBottom: 12 }} />)
      ) : members.length === 0 ? (
        <div className="rm-card" style={{ textAlign: 'center', padding: 40 }}>
          <BsPeopleFill size={40} color="var(--text-muted)" style={{ marginBottom: 12 }} />
          <h5>No members yet</h5>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Share invite code <strong style={{ color: 'var(--rm-blue)' }}>{room.code}</strong> to invite roommates</p>
        </div>
      ) : (
        members.map((member, idx) => (
          <MemberCard
            key={member._id}
            member={member}
            isMe={member._id?.toString() === user?._id?.toString()}
            colorIdx={idx}
            expenses={activity}
            settlement={balances}
            membersCount={members.length}
          />
        ))
      )}

      {/* Invite more */}
      {members.length < 5 && (
        <div className="rm-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, opacity: 0.7, border: '2px dashed var(--border-color)', padding: 24 }}>
          <BsPeopleFill size={28} color="var(--text-muted)" />
          <div style={{ textAlign: 'center' }}>
            <h6 style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.88rem' }}>Invite More Roommates</h6>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Share code <strong style={{ color: 'var(--rm-blue)' }}>{room.code}</strong> to add more members (up to 5)</p>
          </div>
          <button className="btn-rm-outline" onClick={copyCode} style={{ fontSize: '0.78rem', gap: 6 }}>
            <BsCopy size={11} /> Copy Invite Code
          </button>
        </div>
      )}
    </div>
  );
};

export default Members;
