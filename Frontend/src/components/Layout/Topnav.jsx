import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BsBellFill, BsMoonFill, BsSunFill, BsList, BsPersonFill,
  BsGearFill, BsBoxArrowRight, BsCheckAll
} from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', sub: 'Welcome back! Here\'s your expense summary' },
  '/add-expense': { title: 'Add Expense', sub: 'Record a new expense for your room' },
  '/expenses': { title: 'Expenses', sub: 'View and manage all your expenses' },
  '/members': { title: 'Members', sub: 'Your roommate info and share details' },
  '/reports': { title: 'Reports', sub: 'Visual breakdown of your spending' },
  '/budget': { title: 'Budget', sub: 'Set and track your monthly budget' },
  '/settlement': { title: 'Settlement', sub: 'Settle balances with your roommate' },
  '/admin': { title: 'Admin Panel', sub: 'Control center for room and data' },
  '/settings': { title: 'Settings', sub: 'Account and room preferences' }
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Topnav = ({ onMenuClick, selectedMonth, onMonthChange }) => {
  const { user, logout, room } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef();
  const profileRef = useRef();

  const pageInfo = PAGE_TITLES[pathname] || { title: 'RoomMates', sub: '' };

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/api/notifications?limit=6');
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } catch { /* silent */ }
    };
    fetchNotifs();
    const iv = setInterval(fetchNotifs, 60000);
    return () => clearInterval(iv);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast('All notifications marked as read', 'success');
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast('Logout failed', 'error');
    }
  };

  const now = new Date();
  const currentYear = now.getFullYear();

  return (
    <header className="rm-topnav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <button className="rm-icon-btn rm-menu-btn" onClick={onMenuClick} id="sidebar-toggle" title="Open Menu">
          <BsList size={18} />
        </button>
        <div className="rm-topnav-left">
          <h4>{pageInfo.title}</h4>
          {pageInfo.sub && <p className="rm-topnav-sub">{pageInfo.sub}</p>}
        </div>
      </div>

      <div className="rm-topnav-right">
        {/* Month Selector */}
        {(pathname === '/dashboard' || pathname === '/reports' || pathname === '/budget') && (
          <div className="rm-month-select rm-topnav-month-select">
            <select
              value={selectedMonth.month}
              onChange={e => onMonthChange({ ...selectedMonth, month: Number(e.target.value) })}
              id="month-selector"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedMonth.year}
              onChange={e => onMonthChange({ ...selectedMonth, year: Number(e.target.value) })}
            >
              {[currentYear - 1, currentYear].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Theme Toggle */}
        <button className="rm-icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? <BsMoonFill size={14} /> : <BsSunFill size={14} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="rm-icon-btn" onClick={() => setShowNotif(s => !s)} id="notif-btn">
            <BsBellFill size={14} />
            {unreadCount > 0 && <span className="rm-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="rm-notif-panel">
              <div className="rm-notif-header">
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rm-blue)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <BsCheckAll /> Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No notifications yet
                  </div>
                ) : notifications.map(n => (
                  <div key={n._id} className={`rm-notif-item ${!n.read ? 'unread' : ''}`}>
                    <h6>{n.title}</h6>
                    <p>{n.message}</p>
                    <div className="notif-time">{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div className="rm-avatar" onClick={() => setShowProfile(s => !s)} id="profile-btn">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          {showProfile && (
            <div className="rm-profile-dropdown">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                {room && (
                  <div style={{ marginTop: 4, fontSize: '0.7rem', color: 'var(--rm-blue)', fontWeight: 600 }}>
                    🏠 {room.name} ({room.code})
                  </div>
                )}
              </div>
              <button className="rm-dropdown-item" onClick={() => { navigate('/settings'); setShowProfile(false); }}>
                <BsPersonFill /> Profile & Room Settings
              </button>
              <button className="rm-dropdown-item danger" onClick={handleLogout}>
                <BsBoxArrowRight /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topnav;
