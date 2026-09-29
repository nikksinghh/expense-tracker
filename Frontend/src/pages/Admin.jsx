import { useState, useEffect } from 'react';
import {
  BsShieldLockFill, BsHouseFill, BsPeopleFill, BsTrashFill,
  BsClipboardCheck, BsClipboard, BsPencilFill, BsArrowRepeat,
  BsDownload, BsExclamationTriangleFill, BsCheckCircleFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency } from '../utils/helpers';

const Admin = () => {
  const { user, room, refreshRoom } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalExpenses: 0, totalAmount: 0 });
  const [roomName, setRoomName] = useState(room?.name || '');
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (room) setRoomName(room.name);
  }, [room]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/expenses/summary');
        if (res.data?.stats) {
          setStats(res.data.stats);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleCopyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    toast('Room invite code copied!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleUpdateRoomName = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast('Please enter a valid room name', 'error');
      return;
    }
    try {
      setIsUpdating(true);
      await api.put('/api/rooms/update', { name: roomName.trim() });
      await refreshRoom();
      toast('Room name updated successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update room', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetExpenses = async () => {
    try {
      setResetting(true);
      const res = await api.delete('/api/rooms/reset-expenses');
      toast(res.data?.message || 'All expenses reset successfully!', 'success');
      setShowResetModal(false);
      setStats({ totalExpenses: 0, totalAmount: 0 });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reset expenses', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await api.get('/api/expenses?limit=1000');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `roommates_expenses_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Data exported successfully!', 'success');
    } catch {
      toast('Failed to export data', 'error');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="rm-card" style={{
        background: 'linear-gradient(135deg, #1D72FE 0%, #0c4dc7 100%)',
        color: 'white',
        padding: '24px',
        marginBottom: 20,
        borderRadius: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <BsShieldLockFill size={22} />
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: 700 }}>
                Control Center
              </span>
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.6rem' }}>Admin & Room Manager</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
              Manage your room settings, roommates, and data from one central dashboard.
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: 14,
            padding: '12px 18px',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '0.72rem', opacity: 0.8 }}>Current Room</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{room?.name || 'No Room'}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Code: <strong>{room?.code}</strong></div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="summary-cards" style={{ marginBottom: 20 }}>
        <div className="summary-card total">
          <div className="card-icon"><BsHouseFill /></div>
          <div className="card-label">Room Capacity</div>
          <div className="card-value">{room?.members?.length || 1} / 2</div>
          <div className="card-sub">{room?.members?.length === 2 ? 'Room is Full (2/2)' : '1 Spot Available'}</div>
        </div>

        <div className="summary-card yours">
          <div className="card-icon"><BsPeopleFill /></div>
          <div className="card-label">Total Room Expenses</div>
          <div className="card-value">{loading ? '...' : (stats.totalExpenses || 0)}</div>
          <div className="card-sub">Recorded till date</div>
        </div>

        <div className="summary-card roommate">
          <div className="card-icon"><BsCheckCircleFill /></div>
          <div className="card-label">Total Volume Tracked</div>
          <div className="card-value">{loading ? '...' : formatCurrency(stats.totalAmount || 0)}</div>
          <div className="card-sub">Combined spending</div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="rm-grid-2-1" style={{ marginBottom: 20 }}>
        {/* Room Info & Edit */}
        <div className="rm-card">
          <div className="section-header">
            <h5><BsPencilFill style={{ marginRight: 8, color: 'var(--rm-blue)' }} /> Room Information</h5>
          </div>

          <form onSubmit={handleUpdateRoomName}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Room Name</label>
              <input
                type="text"
                className="form-control"
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                placeholder="e.g. Flat 302, Green Glen"
                required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="form-label">Invite Code (Share with Roommate)</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="form-control"
                  value={room?.code || ''}
                  readOnly
                  style={{ fontWeight: 700, letterSpacing: '1px', background: 'var(--bg-input)' }}
                />
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleCopyCode}
                  style={{ minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {copied ? <><BsClipboardCheck /> Copied</> : <><BsClipboard /> Copy</>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUpdating}
              style={{ width: '100%' }}
            >
              {isUpdating ? 'Saving...' : 'Save Room Details'}
            </button>
          </form>
        </div>

        {/* Roommates Card */}
        <div className="rm-card">
          <div className="section-header">
            <h5><BsPeopleFill style={{ marginRight: 8, color: 'var(--rm-blue)' }} /> Room Members</h5>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {room?.members?.map((m, idx) => (
              <div
                key={m._id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)'
                }}
              >
                <div className="rm-avatar" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>
                  {m.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {m.name} {m._id === user?._id && <span style={{ fontSize: '0.68rem', color: 'var(--rm-blue)', fontWeight: 600 }}>(You)</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.email}
                  </div>
                </div>
              </div>
            ))}

            {(!room?.members || room.members.length < 2) && (
              <div style={{
                padding: '14px',
                border: '1.5px dashed var(--rm-blue)',
                borderRadius: 12,
                textAlign: 'center',
                background: 'var(--rm-blue-pale)'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--rm-blue)', marginBottom: 4 }}>
                  Invite Roommate
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                  Share code <strong>{room?.code}</strong> with your second roommate to join.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone & Data Operations */}
      <div className="rm-card" style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}>
        <div className="section-header">
          <h5 style={{ color: 'var(--rm-red)' }}>
            <BsExclamationTriangleFill style={{ marginRight: 8 }} /> Data Management & Reset
          </h5>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Perform maintenance actions on your room data. Use with caution.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleExportData}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BsDownload /> Export Expenses (JSON)
          </button>

          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={() => setShowResetModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <BsTrashFill /> Clear All Room Expenses
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="rm-modal-backdrop" onClick={() => setShowResetModal(false)}>
          <div className="rm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="rm-modal-header" style={{ borderBottom: '1px solid var(--divider)' }}>
              <h5 style={{ color: 'var(--rm-red)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BsExclamationTriangleFill /> Confirm Reset
              </h5>
              <button className="btn-close" onClick={() => setShowResetModal(false)}></button>
            </div>
            <div className="rm-modal-body" style={{ padding: '20px 0' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                Are you sure you want to <strong>delete all expenses and settlement records</strong> for this room?
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                This action cannot be undone. All expense tracking for {room?.name} will be reset to ₹0.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleResetExpenses} disabled={resetting}>
                {resetting ? 'Resetting...' : 'Yes, Delete All Expenses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
