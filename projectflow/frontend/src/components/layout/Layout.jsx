import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '⬡', label: 'Dashboard' },
  { to: '/projects', icon: '◈', label: 'Projects' },
  { to: '/my-tasks', icon: '◎', label: 'My Tasks' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="layout">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="sidebar-logo">
          <div className="sidebar-logo-icon">⬡</div>
          <span className="sidebar-logo-text">ProjectFlow</span>
        </NavLink>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="dropdown-wrapper">
            <div className="sidebar-user" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="sidebar-avatar">
                {user?.avatar ? <img src={user.avatar} alt={user.name} /> : initials}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name}</div>
                <div className="sidebar-user-role">{user?.email}</div>
              </div>
            </div>
            {showDropdown && (
              <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', marginBottom: 4 }}>
                <button className="dropdown-item" onClick={() => { navigate('/profile'); setShowDropdown(false); }}>
                  ◎ Profile
                </button>
                <div className="divider" />
                <button className="dropdown-item danger" onClick={handleLogout}>
                  ⇥ Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
