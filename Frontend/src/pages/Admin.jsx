import { useState, useEffect } from 'react';
import {
  BsShieldLockFill, BsPeopleFill, BsHouseFill, BsCashStack,
  BsTrashFill, BsDownload, BsSearch, BsArrowRepeat, BsCheckCircleFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { formatCurrency, formatDate } from '../utils/helpers';

const Admin = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    stats: { totalUsers: 0, totalRooms: 0, totalExpenses: 0, totalVolume: 0 },
    users: [],
    rooms: [],
    recentExpenses: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

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

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) return;
    try {
      setDeletingId(userId);
      await api.delete(`/api/admin/users/${userId}`);
      toast(`User ${userName} deleted`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete user', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete room "${roomName}" and all its expenses?`)) return;
    try {
      setDeletingId(roomId);
      await api.delete(`/api/admin/rooms/${roomId}`);
      toast(`Room ${roomName} deleted`, 'success');
      await fetchOverview();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete room', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(overview, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `platform_database_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast('Platform backup exported successfully!', 'success');
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

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Admin Header Banner */}
      <div className="rm-card" style={{
        background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        color: 'white',
        padding: '24px',
        marginBottom: 20,
        borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                background: '#EF4444',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: '0.5px'
              }}>
                MASTER ADMIN
              </span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Superuser Access</span>
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.6rem' }}>Admin Control Center</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85rem' }}>
              Welcome {user?.name}! Manage all users, rooms, and platform transactions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-outline-light"
              onClick={fetchOverview}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <BsArrowRepeat /> Refresh
            </button>
            <button
              className="btn btn-primary"
              onClick={handleExportAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
            >
              <BsDownload /> Export Backup
            </button>
          </div>
        </div>
      </div>

      {/* Global Stats */}
      <div className="summary-cards" style={{ marginBottom: 20 }}>
        <div className="summary-card total">
          <div className="card-icon"><BsPeopleFill /></div>
          <div className="card-label">Total Users</div>
          <div className="card-value">{loading ? '...' : (overview.stats?.totalUsers || 0)}</div>
          <div className="card-sub">Registered accounts</div>
        </div>

        <div className="summary-card yours">
          <div className="card-icon"><BsHouseFill /></div>
          <div className="card-label">Total Rooms</div>
          <div className="card-value">{loading ? '...' : (overview.stats?.totalRooms || 0)}</div>
          <div className="card-sub">Active households</div>
        </div>

        <div className="summary-card roommate">
          <div className="card-icon"><BsCashStack /></div>
          <div className="card-label">Total Transactions</div>
          <div className="card-value">{loading ? '...' : (overview.stats?.totalExpenses || 0)}</div>
          <div className="card-sub">Expenses created</div>
        </div>

        <div className="summary-card budget">
          <div className="card-icon"><BsCheckCircleFill /></div>
          <div className="card-label">Total Volume</div>
          <div className="card-value">{loading ? '...' : formatCurrency(overview.stats?.totalVolume || 0)}</div>
          <div className="card-sub">System-wide spending</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, borderBottom: '1px solid var(--divider)', paddingBottom: 10 }}>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('users')}
          style={{ borderRadius: 10, fontSize: '0.82rem', fontWeight: 600 }}
        >
          👥 Users ({overview.users?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('rooms')}
          style={{ borderRadius: 10, fontSize: '0.82rem', fontWeight: 600 }}
        >
          🏠 Rooms ({overview.rooms?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'expenses' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('expenses')}
          style={{ borderRadius: 10, fontSize: '0.82rem', fontWeight: 600 }}
        >
          🧾 Recent Expenses ({overview.recentExpenses?.length || 0})
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Search by name, email, room, or code..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 36, height: 42 }}
        />
        <BsSearch style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }} />
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="rm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="rm-table" style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Room</th>
                  <th>Joined Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="rm-avatar" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                            {u.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{u.name}</div>
                            {u.phone && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{u.email}</td>
                      <td>
                        <span style={{
                          background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(29, 114, 254, 0.1)',
                          color: u.role === 'admin' ? 'var(--rm-red)' : 'var(--rm-blue)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td>
                        {u.room ? (
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--rm-blue)' }}>
                            🏠 {u.room.name} ({u.room.code})
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No Room</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td>
                        {u._id !== user?._id && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteUser(u._id, u.name)}
                            disabled={deletingId === u._id}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            <BsTrashFill /> Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rooms */}
      {activeTab === 'rooms' && (
        <div className="rm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="rm-table" style={{ minWidth: 650 }}>
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Invite Code</th>
                  <th>Members</th>
                  <th>Created By</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No rooms found
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map(r => (
                    <tr key={r._id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>🏠 {r.name}</td>
                      <td>
                        <span style={{ background: 'var(--rm-blue-pale)', color: 'var(--rm-blue)', padding: '4px 8px', borderRadius: 6, fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.5px' }}>
                          {r.code}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {r.members?.length || 0}/2 members
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {r.createdBy?.name || 'Unknown'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {formatDate(r.createdAt)}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteRoom(r._id, r.name)}
                          disabled={deletingId === r._id}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <BsTrashFill /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Recent Expenses */}
      {activeTab === 'expenses' && (
        <div className="rm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="rm-table" style={{ minWidth: 650 }}>
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
                {overview.recentExpenses?.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      No expenses recorded yet
                    </td>
                  </tr>
                ) : (
                  overview.recentExpenses?.map(exp => (
                    <tr key={exp._id}>
                      <td style={{ fontWeight: 600 }}>{exp.title}</td>
                      <td style={{ fontSize: '0.78rem' }}>{exp.category}</td>
                      <td style={{ fontWeight: 700, color: 'var(--rm-red)' }}>{formatCurrency(exp.amount)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{exp.paidBy?.name || 'User'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--rm-blue)' }}>{exp.room?.name || 'Room'}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(exp.createdAt)}</td>
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
