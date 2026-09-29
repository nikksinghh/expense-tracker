import { NavLink, useNavigate } from 'react-router-dom';
import {
  BsHouseDoorFill, BsPlusCircleFill, BsListUl, BsPeopleFill,
  BsBarChartFill, BsWalletFill, BsArrowLeftRight, BsGearFill,
  BsHouseFill, BsBoxArrowRight, BsShieldLockFill
} from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const navItems = [
  { to: '/dashboard', icon: <BsHouseDoorFill />, label: 'Dashboard' },
  { to: '/add-expense', icon: <BsPlusCircleFill />, label: 'Add Expense' },
  { to: '/expenses', icon: <BsListUl />, label: 'Expenses' },
  { to: '/members', icon: <BsPeopleFill />, label: 'Members' },
  { to: '/reports', icon: <BsBarChartFill />, label: 'Reports' },
  { to: '/budget', icon: <BsWalletFill />, label: 'Budget' },
  { to: '/settlement', icon: <BsArrowLeftRight />, label: 'Settlement' },
  { to: '/settings', icon: <BsGearFill />, label: 'Settings' }
];

const Sidebar = ({ open, onClose }) => {
  const { user, room, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast('Logout failed', 'error');
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99 }}
          onClick={onClose}
        />
      )}

      <aside className={`rm-sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="rm-sidebar-logo">
          <div className="logo-icon">
            <BsHouseFill />
          </div>
          <span className="logo-text">RoomMates</span>
        </div>

        {/* Room chip */}
        {room && (
          <div style={{ padding: '8px 12px', margin: '0 10px 4px' }}>
            <div style={{
              background: 'var(--rm-blue-pale)',
              borderRadius: 10,
              padding: '7px 12px',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <BsHouseFill size={12} color="var(--rm-blue)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--rm-blue)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {room.name}
                </div>
                <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>Code: {room.code}</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="rm-sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rm-nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <hr style={{ margin: '8px 0', borderColor: 'var(--divider)' }} />

          <button className="rm-nav-item" onClick={handleLogout} style={{ color: 'var(--rm-red)' }}>
            <span className="nav-icon"><BsBoxArrowRight /></span>
            Logout
          </button>
        </nav>

        {/* Footer */}
        <div className="rm-sidebar-footer">
          <div className="rm-sidebar-promo">
            <h6>👋 {user?.name?.split(' ')[0] || 'Hey'}</h6>
            <p>{user?.email}</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
