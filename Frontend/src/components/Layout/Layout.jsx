import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BsHouseDoorFill, BsPlusCircleFill, BsListUl,
  BsBarChartFill, BsWalletFill, BsShieldLockFill, BsGearFill
} from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topnav from './Topnav';

const mobileNavItems = [
  { to: '/dashboard', icon: <BsHouseDoorFill />, label: 'Home' },
  { to: '/expenses', icon: <BsListUl />, label: 'Expenses' },
  { to: '/add-expense', icon: <BsPlusCircleFill />, label: 'Add' },
  { to: '/reports', icon: <BsBarChartFill />, label: 'Reports' },
  { to: '/settlement', icon: <BsWalletFill />, label: 'Settle' }
];

const adminMobileNavItems = [
  { to: '/admin', icon: <BsShieldLockFill />, label: 'Admin Portal' },
  { to: '/settings', icon: <BsGearFill />, label: 'Settings' }
];

const Layout = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear()
  });

  const activeNavItems = user?.role === 'admin' ? adminMobileNavItems : mobileNavItems;

  return (
    <div className="rm-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="rm-main">
        <Topnav
          onMenuClick={() => setSidebarOpen(true)}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />

        <main className="rm-content">
          {typeof children === 'function' ? children({ selectedMonth }) : children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="rm-mobile-nav">
        <div className="rm-mobile-nav-inner">
          {activeNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `rm-mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <span className="mn-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
