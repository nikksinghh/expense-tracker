import { useState, useEffect } from 'react';
import {
  BsShieldLockFill, BsPeopleFill, BsHouseFill, BsCashStack,
  BsTrashFill, BsDownload, BsSearch, BsArrowRepeat, BsCheckCircleFill,
  BsPersonXFill, BsPersonCheckFill, BsBarChartFill, BsEyeFill,
  BsChevronDown, BsChevronUp, BsExclamationTriangleFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/helpers';

const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="rm-card" style={{ textAlign: 'center', padding: '18px 16px' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', margin: '0 auto 10px' }}>{icon}</div>
    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
    {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Admin = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    stats: { totalUsers: 0, totalRooms: 0, totalExpenses: 0, totalVolume: 0, activeRooms: 0, blockedUsers: 0 },
    users: [],
    rooms: [],
    recentExpenses: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [actionId, setActionId] = useState(null);
  const [expandedRoom, setExpandedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState({});

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/overview');
      if (res.data?.success) {
        setOverview(res.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      setActionId(userId);
      await api.delete(`/api/admin/users/${userId}`);
      toast(`User ${userName} deleted`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally { setActionId(null); }
  };

  const handleToggleBlock = async (userId, userName, isBlocked) => {
    try {
      setActionId(userId);
      const res = await api.put(`/api/admin/users/${userId}/block`);
      toast(res.data.message, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update user', 'error');
    } finally { setActionId(null); }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Delete room "${roomName}" and ALL its data?`)) return;
    try {
      setActionId(roomId);
      await api.delete(`/api/admin/rooms/${roomId}`);
      toast(`Room ${roomName} deleted`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete room', 'error');
    } finally { setActionId(null); }
  };

  const handleExpandRoom = async (roomId) => {
    if (expandedRoom === roomId) { setExpandedRoom(null); return; }
    setExpandedRoom(roomId);
    if (roomDetails[roomId]) return;
    try {
      const res = await api.get(`/api/admin/rooms/${roomId}`);
      if (res.data.success) setRoomDetails(d => ({ ...d, [roomId]: res.data }));
    } catch { /* silent */ }
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(overview, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `platform_backup_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Platform backup exported!', 'success');
  };

  const filteredUsers = overview.users?.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.room?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredRooms = overview.rooms?.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const tabs = [
    { key: 'dashboard', label: '📊 Dashboard' },
    { key: 'users', label: `👥 Users (${overview.users?.length || 0})` },
    { key: 'rooms', label: `🏠 Rooms (${overview.rooms?.length || 0})` },
    { key: 'expenses', label: `🧾 Expenses (${overview.recentExpenses?.length || 0})` },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Admin Header */}
      <div className="rm-card" style={{
        background: 'linear-gradient(135deg, #0f2057 0%, #1d3a8a 50%, #1d72fe 100%)',
        color: 'white', padding: '20px 24px', marginBottom: 20,
        borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ background: '#EF4444', color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.5px' }}>MASTER ADMIN</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Superuser Access</span>
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem' }}>🛡️ Admin Control Center</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.75, fontSize: '0.82rem' }}>
              Welcome {user?.name}! Full platform control panel.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline-light" onClick={fetchOverview} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', borderRadius: 10 }}>
              <BsArrowRepeat /> Refresh
            </button>
            <button className="btn btn-primary" onClick={handleExportAll} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', borderRadius: 10 }}>
              <BsDownload /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Tabs - Mobile Scrollable */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.key}
            className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setActiveTab(t.key)}
            style={{ borderRadius: 10, fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
            <StatCard icon={<BsPeopleFill />} label="Total Users" value={loading ? '...' : overview.stats?.totalUsers || 0} sub="Registered accounts" color="var(--rm-blue)" />
            <StatCard icon={<BsHouseFill />} label="Total Rooms" value={loading ? '...' : overview.stats?.totalRooms || 0} sub={`${overview.stats?.activeRooms || 0} active`} color="var(--rm-green)" />
            <StatCard icon={<BsCashStack />} label="Transactions" value={loading ? '...' : overview.stats?.totalExpenses || 0} sub="Total expenses" color="var(--rm-purple)" />
            <StatCard icon={<BsCheckCircleFill />} label="Total Volume" value={loading ? '...' : formatCurrency(overview.stats?.totalVolume || 0)} sub="System-wide spending" color="var(--rm-orange)" />
            <StatCard icon={<BsExclamationTriangleFill />} label="Blocked Users" value={loading ? '...' : overview.stats?.blockedUsers || 0} sub="Access restricted" color="var(--rm-red)" />
          </div>

          {/* Recent Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="rm-card">
              <h5 style={{ fontWeight: 700, marginBottom: 14 }}>Recent Users</h5>
              {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />) :
                (overview.users?.slice(0, 5) || []).map(u => (
                  <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                    <div className="rm-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>{u.name?.[0]?.toUpperCase() || 'U'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: u.isBlocked ? 'var(--rm-red-light)' : u.role === 'admin' ? 'rgba(239,68,68,0.12)' : 'var(--rm-blue-pale)', color: u.isBlocked ? 'var(--rm-red)' : u.role === 'admin' ? 'var(--rm-red)' : 'var(--rm-blue)' }}>
                      {u.isBlocked ? 'BLOCKED' : u.role?.toUpperCase() || 'USER'}
                    </span>
                  </div>
                ))
              }
            </div>
            <div className="rm-card">
              <h5 style={{ fontWeight: 700, marginBottom: 14 }}>Recent Rooms</h5>
              {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, marginBottom: 8 }} />) :
                (overview.rooms?.slice(0, 5) || []).map(r => (
                  <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--rm-blue-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🏠</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{r.members?.length || 0} members</div>
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)', letterSpacing: 0.5 }}>{r.code}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <input type="text" className="form-control" placeholder="Search users by name, email, room..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36 }} />
            <BsSearch style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted)' }} />
          </div>
          
          {/* Mobile-friendly card list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />) :
              filteredUsers.length === 0 ? (
                <div className="rm-empty-state"><div className="rm-empty-icon">👥</div><h5>No users found</h5></div>
              ) :
              filteredUsers.map(u => (
                <div key={u._id} className="rm-card" style={{ padding: '14px 16px', opacity: u.isBlocked ? 0.8 : 1, border: u.isBlocked ? '1.5px solid var(--rm-red)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div className="rm-avatar" style={{ width: 42, height: 42, fontSize: '1rem', flexShrink: 0 }}>{u.name?.[0]?.toUpperCase() || 'U'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.name}</span>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: u.role === 'admin' ? 'rgba(239,68,68,0.12)' : 'var(--rm-blue-pale)', color: u.role === 'admin' ? 'var(--rm-red)' : 'var(--rm-blue)' }}>
                          {u.role?.toUpperCase() || 'USER'}
                        </span>
                        {u.isBlocked && <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'var(--rm-red-light)', color: 'var(--rm-red)' }}>BLOCKED</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      {u.room && <div style={{ fontSize: '0.72rem', color: 'var(--rm-blue)', marginTop: 2 }}>🏠 {u.room.name} ({u.room.code})</div>}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                      <div>{formatDate(u.createdAt)}</div>
                    </div>
                    {u._id !== user?._id && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          className={`btn btn-sm ${u.isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}`}
                          onClick={() => handleToggleBlock(u._id, u.name, u.isBlocked)}
                          disabled={actionId === u._id}
                          style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8 }}
                          title={u.isBlocked ? 'Unblock' : 'Block'}>
                          {actionId === u._id ? '...' : u.isBlocked ? <BsPersonCheckFill /> : <BsPersonXFill />}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={actionId === u._id}
                          style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8 }}>
                          {actionId === u._id ? '...' : <BsTrashFill />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <>
          <div style={{ marginBottom: 14, position: 'relative' }}>
            <input type="text" className="form-control" placeholder="Search rooms by name or code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36 }} />
            <BsSearch style={{ position: 'absolute', left: 13, top: 13, color: 'var(--text-muted)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />) :
              filteredRooms.length === 0 ? (
                <div className="rm-empty-state"><div className="rm-empty-icon">🏠</div><h5>No rooms found</h5></div>
              ) :
              filteredRooms.map(r => (
                <div key={r._id} className="rm-card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--rm-blue-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🏠</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {r.members?.length || 0} members • Created by {r.createdBy?.name || 'Unknown'} • {formatDate(r.createdAt)}
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {r.members?.map(m => (
                          <span key={m._id} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                            {m.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '4px 8px', borderRadius: 8, background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)', letterSpacing: 1 }}>{r.code}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleExpandRoom(r._id)}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8 }}>
                        <BsEyeFill /> {expandedRoom === r._id ? <BsChevronUp /> : <BsChevronDown />}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteRoom(r._id, r.name)}
                        disabled={actionId === r._id}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 8 }}>
                        {actionId === r._id ? '...' : <BsTrashFill />}
                      </button>
                    </div>
                  </div>
                  {/* Room detail expansion */}
                  {expandedRoom === r._id && roomDetails[r._id] && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>📊 Room Stats</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {roomDetails[r._id].stats?.totalExpenses} expenses • {formatCurrency(roomDetails[r._id].stats?.totalSpent)}
                        </span>
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {(roomDetails[r._id].expenses || []).slice(0, 10).map(exp => (
                          <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--divider)', fontSize: '0.78rem' }}>
                            <span style={{ fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{exp.title}</span>
                            <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: 8 }}>{exp.payer?.name || exp.paidBy?.name || 'User'}</span>
                            <span style={{ fontWeight: 700, color: 'var(--rm-red)', flexShrink: 0 }}>{formatCurrency(exp.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="rm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="rm-table" style={{ minWidth: 560 }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Paid By</th>
                  <th>Room</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 120 : 80 }} /></td>)}</tr>
                  ))
                ) : overview.recentExpenses?.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No expenses recorded yet</td></tr>
                ) : (
                  overview.recentExpenses?.map(exp => (
                    <tr key={exp._id}>
                      <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{exp.title}</td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{exp.category}</td>
                      <td style={{ fontWeight: 700, color: 'var(--rm-red)', fontSize: '0.82rem' }}>{formatCurrency(exp.amount)}</td>
                      <td style={{ fontSize: '0.78rem' }}>{exp.payer?.name || exp.paidBy?.name || 'User'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--rm-blue)' }}>{exp.room?.name || 'Room'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDate(exp.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
