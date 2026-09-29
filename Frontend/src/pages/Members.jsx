import { useState, useEffect } from 'react';
import { BsCopy, BsPersonFill, BsPeopleFill, BsClock } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, getInitials } from '../utils/helpers';

const AVATAR_COLORS = ['linear-gradient(135deg,#1d72fe,#845ec2)', 'linear-gradient(135deg,#f97316,#ffd166)'];

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
          api.get('/api/expenses?limit=20')
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

  const myActivity = activity.filter(e => e.paidBy?._id === user?._id);
  const theirActivity = activity.filter(e => e.paidBy?._id !== user?._id);
  const myTotal = myActivity.reduce((s, e) => s + (e.amount || 0), 0);
  const theirTotal = theirActivity.reduce((s, e) => s + (e.amount || 0), 0);

  const roommate = members.find(m => m._id !== user?._id);

  if (!room) {
    return (
      <div className="rm-empty-state" style={{ paddingTop: 80 }}>
        <div className="rm-empty-icon">🏠</div>
        <h5>No room yet</h5>
        <p>Set up a room to see member details</p>
      </div>
    );
  }

  return (
    <div>
      {/* Room Info */}
      <div className="rm-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: '0 0 4px', fontWeight: 800 }}>🏠 {room.name}</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {members.length}/2 members • Created {new Date(room.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'var(--rm-blue-pale)', borderRadius: 12, padding: '8px 14px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Invite Code</div>
              <div style={{ fontWeight: 800, color: 'var(--rm-blue)', letterSpacing: 2, fontSize: '1rem' }}>{room.code}</div>
            </div>
            <button className="btn-rm-outline" onClick={copyCode} style={{ gap: 6 }}>
              <BsCopy size={12} /> Copy Code
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* My Card */}
        <div className="rm-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: AVATAR_COLORS[0], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, boxShadow: '0 4px 14px rgba(29,114,254,0.3)', flexShrink: 0 }}>
              {getInitials(user?.name)}
            </div>
            <div>
              <h5 style={{ margin: '0 0 4px', fontWeight: 700 }}>{user?.name}</h5>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              <span className="rm-badge-pill rm-badge-shared" style={{ marginTop: 4 }}>You</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>PAID</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rm-blue)' }}>{loading ? '...' : formatCurrency(myTotal)}</div>
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>EXPENSES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rm-navy)' }}>{loading ? '...' : myActivity.length}</div>
            </div>
          </div>

          {user?.upiId && (
            <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              💳 UPI: <strong style={{ color: 'var(--text-primary)' }}>{user.upiId}</strong>
            </div>
          )}
        </div>

        {/* Roommate Card */}
        {roommate ? (
          <div className="rm-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: AVATAR_COLORS[1], color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800, boxShadow: '0 4px 14px rgba(249,115,22,0.3)', flexShrink: 0 }}>
                {getInitials(roommate.name)}
              </div>
              <div>
                <h5 style={{ margin: '0 0 4px', fontWeight: 700 }}>{roommate.name}</h5>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{roommate.email}</div>
                <span className="rm-badge-pill rm-badge-personal" style={{ marginTop: 4 }}>Roommate</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>PAID</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rm-purple)' }}>{loading ? '...' : formatCurrency(theirTotal)}</div>
              </div>
              <div style={{ background: 'var(--bg-input)', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>EXPENSES</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--rm-navy)' }}>{loading ? '...' : theirActivity.length}</div>
              </div>
            </div>

            {roommate.upiId && (
              <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                💳 UPI: <strong style={{ color: 'var(--text-primary)' }}>{roommate.upiId}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="rm-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, opacity: 0.7, border: '2px dashed var(--border-color)' }}>
            <BsPeopleFill size={32} color="var(--text-muted)" />
            <div style={{ textAlign: 'center' }}>
              <h6 style={{ fontWeight: 700, marginBottom: 4 }}>Waiting for roommate</h6>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Share code <strong style={{ color: 'var(--rm-blue)' }}>{room.code}</strong> to invite</p>
            </div>
          </div>
        )}
      </div>

      {/* Settlement Balance */}
      {balances.netAmount !== undefined && (
        <div className="rm-card">
          <h5 style={{ fontWeight: 700, marginBottom: 14 }}>Current Balance</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: balances.relationship === 'settled' ? 'var(--rm-green)' : balances.relationship === 'you_owe_roommate' ? 'var(--rm-red)' : 'var(--rm-green)' }}>
                {formatCurrency(balances.netAmount)}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {balances.relationship === 'settled' ? '✅ All settled' :
                  balances.relationship === 'you_owe_roommate' ? `You owe ${roommate?.name?.split(' ')[0]}` :
                    `${roommate?.name?.split(' ')[0]} owes you`}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>You paid</span>
                <span>Roommate paid</span>
              </div>
              <div style={{ height: 10, background: 'var(--divider)', borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
                <div style={{
                  width: `${myTotal / Math.max(myTotal + theirTotal, 1) * 100}%`,
                  background: 'linear-gradient(90deg, var(--rm-blue), var(--rm-blue-light))',
                  transition: 'width 0.5s ease'
                }} />
                <div style={{ flex: 1, background: 'linear-gradient(90deg, var(--rm-purple), #a78bfa)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                <span style={{ color: 'var(--rm-blue)' }}>{formatCurrency(myTotal)}</span>
                <span style={{ color: 'var(--rm-purple)' }}>{formatCurrency(theirTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
