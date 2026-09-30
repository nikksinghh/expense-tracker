import { useState, useEffect } from 'react';
import {
  BsShieldLockFill, BsPeopleFill, BsHouseFill, BsCashStack,
  BsTrashFill, BsDownload, BsSearch, BsArrowRepeat, BsCheckCircleFill,
  BsPersonXFill, BsPersonCheckFill, BsBarChartFill, BsEyeFill,
  BsChevronDown, BsChevronUp, BsExclamationTriangleFill, BsKeyFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/helpers';

const StatCard = ({ icon, label, value, sub, color, bgLight }) => (
  <div
    className="rm-card"
    style={{
      padding: '16px 14px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      borderRadius: 16,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: bgLight || `${color}18`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.6, background: bgLight || `${color}14`, padding: '2px 8px', borderRadius: 20 }}>
        Live
      </span>
    </div>

    <div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, wordBreak: 'break-word' }}>
        {value}
      </div>
    </div>

    {sub && (
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>•</span>
        <span>{sub}</span>
      </div>
    )}
  </div>
);

const Admin = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchOverview = async (showToast = false) => {
    try {
      setRefreshing(true);
      const res = await api.get('/api/admin/overview');
      if (res.data?.success) {
        setOverview(res.data);
        if (showToast) toast('Dashboard refreshed successfully', 'success');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) return;
    try {
      setActionId(userId);
      await api.delete(`/api/admin/users/${userId}`);
      toast(`User ${userName} deleted successfully`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleToggleBlock = async (userId, userName, isBlocked) => {
    try {
      setActionId(userId);
      const res = await api.put(`/api/admin/users/${userId}/block`);
      toast(res.data.message || (isBlocked ? `User ${userName} unblocked` : `User ${userName} suspended`), 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Delete room "${roomName}" and all associated expenses and settlements?`)) return;
    try {
      setActionId(roomId);
      await api.delete(`/api/admin/rooms/${roomId}`);
      toast(`Room "${roomName}" and its data deleted`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete room', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handleExpandRoom = async (roomId) => {
    if (expandedRoom === roomId) {
      setExpandedRoom(null);
      return;
    }
    setExpandedRoom(roomId);
    if (roomDetails[roomId]) return;
    try {
      const res = await api.get(`/api/admin/rooms/${roomId}`);
      if (res.data.success) {
        setRoomDetails(d => ({ ...d, [roomId]: res.data }));
      }
    } catch {
      // silent
    }
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(overview, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `roommates_platform_backup_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Platform backup JSON exported successfully', 'success');
  };

  const filteredUsers = overview.users?.filter(u =>
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.room?.code?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredRooms = overview.rooms?.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.createdBy?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredExpenses = overview.recentExpenses?.filter(e =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.payer?.name || e.paidBy?.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.room?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const tabs = [
    { key: 'dashboard', label: '📊 Overview' },
    { key: 'users', label: `👥 Users (${overview.users?.length || 0})` },
    { key: 'rooms', label: `🏠 Rooms (${overview.rooms?.length || 0})` },
    { key: 'expenses', label: `🧾 Expenses (${overview.recentExpenses?.length || 0})` },
  ];

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto', paddingBottom: 40 }}>
      {/* 1. Header Card with Guaranteed High Contrast Text & Responsive Wrap */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b1940 0%, #112d70 50%, #1d72fe 100%)',
          color: '#ffffff',
          padding: '22px 20px',
          marginBottom: 20,
          borderRadius: 20,
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 10px 30px rgba(11, 25, 64, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ background: '#ef4444', color: '#ffffff', fontSize: '0.65rem', fontWeight: 900, padding: '3px 10px', borderRadius: 8, letterSpacing: '0.6px', textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>
                Master Admin
              </span>
              <span style={{ fontSize: '0.75rem', color: '#dbeafe', fontWeight: 600 }}>
                Superuser Console
              </span>
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.45rem', color: '#ffffff', letterSpacing: '-0.3px', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              🛡️ Admin Control Center
            </h2>
            <p style={{ margin: '6px 0 0', color: '#e0edff', fontSize: '0.84rem', lineHeight: 1.5, opacity: 0.95 }}>
              Welcome <strong style={{ color: '#ffffff' }}>{user?.name || 'Administrator'}</strong>! Manage users, rooms, expenses, and security.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => fetchOverview(true)}
              disabled={refreshing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 12,
                padding: '9px 15px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <BsArrowRepeat style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 12,
                padding: '9px 16px',
                background: '#ffffff',
                color: '#0f2057',
                border: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <BsDownload />
              <span>Export Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Responsive Scrollable Pill Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          overflowX: 'auto',
          paddingBottom: 6,
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                borderRadius: 12,
                fontSize: '0.82rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                padding: '9px 16px',
                border: isActive ? '1px solid var(--rm-blue)' : '1px solid var(--border-color)',
                background: isActive ? 'var(--rm-blue)' : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 4px 12px rgba(29, 114, 254, 0.25)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 3. Tab Contents */}

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <>
          {/* Stat Cards Grid - Responsive columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 22
            }}
          >
            <StatCard
              icon={<BsPeopleFill />}
              label="Total Users"
              value={loading ? '...' : overview.stats?.totalUsers || 0}
              sub={`${overview.stats?.blockedUsers || 0} suspended`}
              color="var(--rm-blue)"
              bgLight="rgba(29, 114, 254, 0.12)"
            />
            <StatCard
              icon={<BsHouseFill />}
              label="Total Rooms"
              value={loading ? '...' : overview.stats?.totalRooms || 0}
              sub={`${overview.stats?.activeRooms || 0} active groups`}
              color="var(--rm-green)"
              bgLight="rgba(34, 197, 94, 0.12)"
            />
            <StatCard
              icon={<BsCashStack />}
              label="Transactions"
              value={loading ? '...' : overview.stats?.totalExpenses || 0}
              sub="Recorded expenses"
              color="var(--rm-purple)"
              bgLight="rgba(132, 94, 194, 0.12)"
            />
            <StatCard
              icon={<BsCheckCircleFill />}
              label="Total Volume"
              value={loading ? '...' : formatCurrency(overview.stats?.totalVolume || 0)}
              sub="System-wide spending"
              color="var(--rm-orange)"
              bgLight="rgba(249, 115, 22, 0.12)"
            />
            <StatCard
              icon={<BsExclamationTriangleFill />}
              label="Blocked Users"
              value={loading ? '...' : overview.stats?.blockedUsers || 0}
              sub="Restricted access"
              color="var(--rm-red)"
              bgLight="rgba(239, 68, 68, 0.12)"
            />
          </div>

          {/* Recent Activity Grid - Stacks nicely on mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 16
            }}
          >
            {/* Recent Users List */}
            <div className="rm-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h5 style={{ fontWeight: 800, margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BsPeopleFill color="var(--rm-blue)" /> Recent Registered Users
                </h5>
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  style={{ background: 'none', border: 'none', color: 'var(--rm-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>

              {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10, marginBottom: 8 }} />)
              ) : (overview.users?.slice(0, 5) || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No users found</div>
              ) : (
                (overview.users?.slice(0, 5) || []).map(u => (
                  <div
                    key={u._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--divider)'
                    }}
                  >
                    <div className="rm-avatar" style={{ width: 36, height: 36, fontSize: '0.82rem', flexShrink: 0, fontWeight: 700 }}>
                      {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 8,
                        flexShrink: 0,
                        background: u.isBlocked ? 'var(--rm-red-light)' : u.role === 'admin' ? 'rgba(239, 68, 68, 0.14)' : 'var(--rm-blue-pale)',
                        color: u.isBlocked ? 'var(--rm-red)' : u.role === 'admin' ? 'var(--rm-red)' : 'var(--rm-blue)'
                      }}
                    >
                      {u.isBlocked ? 'BLOCKED' : u.role?.toUpperCase() || 'USER'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Recent Rooms List */}
            <div className="rm-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h5 style={{ fontWeight: 800, margin: 0, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BsHouseFill color="var(--rm-green)" /> Recent Active Rooms
                </h5>
                <button
                  type="button"
                  onClick={() => setActiveTab('rooms')}
                  style={{ background: 'none', border: 'none', color: 'var(--rm-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  View All →
                </button>
              </div>

              {loading ? (
                [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 10, marginBottom: 8 }} />)
              ) : (overview.rooms?.slice(0, 5) || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No rooms created yet</div>
              ) : (
                (overview.rooms?.slice(0, 5) || []).map(r => (
                  <div
                    key={r._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--divider)'
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 197, 94, 0.12)', color: 'var(--rm-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                      🏠
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {r.members?.length || 0} members • Code: <strong style={{ color: 'var(--rm-blue)' }}>{r.code}</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)', letterSpacing: 0.5, flexShrink: 0 }}>
                      {r.code}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type="text"
              className="rm-input"
              placeholder="Search users by name, email, or room code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 40, borderRadius: 12 }}
            />
            <BsSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              [...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 14 }} />)
            ) : filteredUsers.length === 0 ? (
              <div className="rm-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👥</div>
                <h5 style={{ fontWeight: 700 }}>No users match your search</h5>
              </div>
            ) : (
              filteredUsers.map(u => (
                <div
                  key={u._id}
                  className="rm-card"
                  style={{
                    padding: '16px',
                    border: u.isBlocked ? '1.5px solid var(--rm-red)' : '1px solid var(--border-color)',
                    background: u.isBlocked ? 'var(--rm-red-light)' : 'var(--bg-card)',
                    borderRadius: 16
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: '220px', flex: '1 1 auto' }}>
                      <div className="rm-avatar" style={{ width: 44, height: 44, fontSize: '1rem', flexShrink: 0, fontWeight: 800 }}>
                        {u.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{u.name}</span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.14)' : 'var(--rm-blue-pale)',
                              color: u.role === 'admin' ? 'var(--rm-red)' : 'var(--rm-blue)'
                            }}
                          >
                            {u.role?.toUpperCase() || 'USER'}
                          </span>
                          {u.isBlocked && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: '#ef4444', color: '#ffffff' }}>
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>
                          {u.email}
                        </div>
                        {u.room && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--rm-blue)', marginTop: 3, fontWeight: 600 }}>
                            🏠 {u.room.name} ({u.room.code})
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        <div>Joined: {formatDate(u.createdAt)}</div>
                      </div>

                      {u._id !== user?._id && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}`}
                            onClick={() => handleToggleBlock(u._id, u.name, u.isBlocked)}
                            disabled={actionId === u._id}
                            style={{ fontSize: '0.74rem', padding: '6px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            title={u.isBlocked ? 'Unblock user' : 'Suspend user'}
                          >
                            {actionId === u._id ? '...' : u.isBlocked ? <><BsPersonCheckFill /> Unblock</> : <><BsPersonXFill /> Block</>}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            disabled={actionId === u._id}
                            style={{ fontSize: '0.74rem', padding: '6px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'center' }}
                            title="Delete user"
                          >
                            {actionId === u._id ? '...' : <BsTrashFill />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB 3: ROOMS MANAGEMENT */}
      {activeTab === 'rooms' && (
        <>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type="text"
              className="rm-input"
              placeholder="Search rooms by name, code, or creator..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 40, borderRadius: 12 }}
            />
            <BsSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 14 }} />)
            ) : filteredRooms.length === 0 ? (
              <div className="rm-card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏠</div>
                <h5 style={{ fontWeight: 700 }}>No rooms match your search</h5>
              </div>
            ) : (
              filteredRooms.map(r => (
                <div key={r._id} className="rm-card" style={{ padding: '16px', borderRadius: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: '220px', flex: '1 1 auto' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34, 197, 94, 0.14)', color: 'var(--rm-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                        🏠
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>{r.name}</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)', letterSpacing: 0.8 }}>
                            {r.code}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.members?.length || 0} members • Created by {r.createdBy?.name || 'Unknown'} • {formatDate(r.createdAt)}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          {r.members?.map(m => (
                            <span key={m._id} style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                              👤 {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleExpandRoom(r._id)}
                        style={{ fontSize: '0.74rem', padding: '6px 12px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <BsEyeFill /> <span>{expandedRoom === r._id ? 'Hide' : 'Details'}</span>
                        {expandedRoom === r._id ? <BsChevronUp /> : <BsChevronDown />}
                      </button>

                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteRoom(r._id, r.name)}
                        disabled={actionId === r._id}
                        style={{ fontSize: '0.74rem', padding: '6px 10px', borderRadius: 10, display: 'inline-flex', alignItems: 'center' }}
                        title="Delete Room & All Expenses"
                      >
                        {actionId === r._id ? '...' : <BsTrashFill />}
                      </button>
                    </div>
                  </div>

                  {/* Room Details Expansion */}
                  {expandedRoom === r._id && roomDetails[r._id] && (
                    <div style={{ marginTop: 14, borderTop: '1px solid var(--divider)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>📊 Room Statistics</span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {roomDetails[r._id].stats?.totalExpenses} transactions • Total: <strong style={{ color: 'var(--rm-blue)' }}>{formatCurrency(roomDetails[r._id].stats?.totalSpent)}</strong>
                        </span>
                      </div>
                      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {(roomDetails[r._id].expenses || []).length === 0 ? (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', padding: '8px 0' }}>No expenses recorded in this room.</div>
                        ) : (
                          (roomDetails[r._id].expenses || []).slice(0, 10).map(exp => (
                            <div key={exp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--divider)', fontSize: '0.78rem' }}>
                              <span style={{ fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8, color: 'var(--text-primary)' }}>{exp.title}</span>
                              <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginRight: 8 }}>{exp.payer?.name || exp.paidBy?.name || 'User'}</span>
                              <span style={{ fontWeight: 800, color: 'var(--rm-red)', flexShrink: 0 }}>{formatCurrency(exp.amount)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* TAB 4: EXPENSES AUDIT LOG */}
      {activeTab === 'expenses' && (
        <>
          <div style={{ marginBottom: 16, position: 'relative' }}>
            <input
              type="text"
              className="rm-input"
              placeholder="Search expenses by title, category, payer, or room..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 40, borderRadius: 12 }}
            />
            <BsSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="rm-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="rm-table" style={{ minWidth: 620, width: '100%' }}>
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
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 16, width: j === 0 ? 140 : 80 }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No transactions recorded
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr key={exp._id}>
                        <td style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{exp.title}</td>
                        <td>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)' }}>
                            {exp.category}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: 'var(--rm-red)', fontSize: '0.84rem' }}>{formatCurrency(exp.amount)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{exp.payer?.name || exp.paidBy?.name || 'User'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--rm-blue)', fontWeight: 600 }}>{exp.room?.name || 'Room'}</td>
                        <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatDate(exp.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;
