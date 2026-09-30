import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BsHouseDoorFill, BsPlusCircleFill, BsListUl,
  BsBarChartFill, BsWalletFill, BsShieldLockFill, BsGearFill,
  BsPeopleFill
} from 'react-icons/bs';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topnav from './Topnav';
import Footer from './Footer';
import { MonthContext } from '../../contexts/MonthContext';

const mobileNavItems = [
  { to: '/dashboard', icon: <BsHouseDoorFill />, label: 'Home' },
  { to: '/expenses', icon: <BsListUl />, label: 'Expenses' },
  { to: '/add-expense', icon: <BsPlusCircleFill />, label: 'Add' },
  { to: '/members', icon: <BsPeopleFill />, label: 'Members' },
  { to: '/settlement', icon: <BsWalletFill />, label: 'Settle' }
];

const adminMobileNavItems = [
  { to: '/admin', icon: <BsShieldLockFill />, label: 'Admin' },
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
    <MonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      <div className="rm-layout">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="rm-main">
          <Topnav
            onMenuClick={() => setSidebarOpen(true)}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />

          <main className="rm-content">
            {/* Support both render-prop and Outlet patterns */}
            {children
              ? (typeof children === 'function' ? children({ selectedMonth }) : children)
              : <Outlet />
            }
          </main>

          <Footer />
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
    </MonthContext.Provider>
  );
};

export default Layout;
