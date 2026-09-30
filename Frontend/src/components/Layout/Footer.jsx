import { Link } from 'react-router-dom';
import { BsShieldCheck, BsHeartFill, BsHouseDoor, BsPeople, BsWallet2, BsBarChartLine } from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';

const Footer = () => {
  const { user, room } = useAuth();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="rm-hyper-footer">
      <div className="rm-footer-content">
        <div className="rm-footer-brand-col">
          <div className="rm-footer-logo">
            <span className="rm-footer-icon">⚡</span>
            <span className="rm-footer-title">Room<span className="rm-accent">Mates</span></span>
            <span className="rm-footer-badge">Hyper v2.0</span>
          </div>
          <p className="rm-footer-desc">
            Smart, effortless expense monitoring & bill splitting for roommates. 
            Real-time balance settlement, secure budgeting, and interactive analytics.
          </p>
          <div className="rm-footer-security-pill">
            <BsShieldCheck className="rm-sec-icon" />
            <span>256-Bit Encrypted & Role Secured</span>
          </div>
        </div>

        {/* Quick Nav Links */}
        <div className="rm-footer-links-group">
          <div className="rm-footer-col">
            <h6 className="rm-footer-col-title">Navigation</h6>
            <ul className="rm-footer-links">
              {user?.role === 'admin' ? (
                <>
                  <li><Link to="/admin">Admin Dashboard</Link></li>
                  <li><Link to="/settings">System Settings</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/dashboard"><BsHouseDoor /> Dashboard</Link></li>
                  <li><Link to="/expenses"><BsWallet2 /> All Expenses</Link></li>
                  <li><Link to="/members"><BsPeople /> Room Members</Link></li>
                  <li><Link to="/settlement"><BsWallet2 /> Settle Up</Link></li>
                  <li><Link to="/reports"><BsBarChartLine /> Visual Reports</Link></li>
                </>
              )}
            </ul>
          </div>

          <div className="rm-footer-col">
            <h6 className="rm-footer-col-title">Active Workspace</h6>
            <div className="rm-footer-room-status">
              {room ? (
                <>
                  <div className="rm-room-chip">
                    <span className="rm-room-indicator pulse"></span>
                    <span className="rm-room-name">{room.name}</span>
                  </div>
                  <div className="rm-room-details">
                    <span>Code: <strong>{room.code}</strong></span>
                    <span>•</span>
                    <span>{room.members?.length || 1} Active Roommate(s)</span>
                  </div>
                </>
              ) : (
                <div className="rm-room-empty">
                  <span>No Room Linked</span>
                  <Link to="/room-setup" className="rm-setup-link">Create / Join</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rm-footer-bottom">
        <div className="rm-footer-copy">
          © {currentYear} RoomMates Platform. Built with <BsHeartFill style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0 4px' }} /> for seamless shared living.
        </div>
        <div className="rm-footer-extra">
          <span className="rm-status-text">🟢 All Systems Operational</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
