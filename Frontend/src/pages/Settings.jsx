import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BsPersonFill, BsShieldFill, BsBellFill, BsMoonFill,
  BsSunFill, BsBoxArrowRight, BsDoorOpen, BsExclamationTriangleFill
} from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const Settings = () => {
  const { user, room, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '', upiId: user?.upiId || '' });
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [roomName, setRoomName] = useState(room?.name || '');
  const [saving, setSaving] = useState(false);

  const handleUpdateRoomName = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return toast('Room name cannot be empty', 'warning');
    setSaving(true);
    try {
      const res = await api.put('/api/rooms/update', { name: roomName.trim() });
      if (res.data.room) {
        updateRoom(res.data.room);
      }
      toast('Room name updated successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update room name', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) return toast('Name cannot be empty', 'warning');
    setSaving(true);
    try {
      const res = await api.put('/api/users/profile', profile);
      updateUser(res.data.user);
      toast('Profile updated!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwords.current || !passwords.newPw) return toast('Fill all password fields', 'warning');
    if (passwords.newPw !== passwords.confirm) return toast('New passwords do not match', 'warning');
    if (passwords.newPw.length < 6) return toast('Password must be at least 6 characters', 'warning');
    setSaving(true);
    try {
      await api.put('/api/users/password', { currentPassword: passwords.current, newPassword: passwords.newPw });
      toast('Password changed successfully!', 'success');
      setPasswords({ current: '', newPw: '', confirm: '' });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm(`Are you sure you want to leave "${room?.name}"? This cannot be undone.`)) return;
    try {
      await api.post('/api/rooms/leave');
      toast('You left the room', 'info');
      navigate('/room-setup');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to leave room', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      toast('Logout failed', 'error');
    }
  };

  const sections = [
    { key: 'profile', icon: <BsPersonFill />, label: 'Profile' },
    { key: 'security', icon: <BsShieldFill />, label: 'Security' },
    { key: 'appearance', icon: theme === 'light' ? <BsMoonFill /> : <BsSunFill />, label: 'Appearance' },
    { key: 'room', icon: <BsDoorOpen />, label: 'Room' }
  ];

  return (
    <div className="rm-settings-layout" style={{ maxWidth: 800 }}>
      {/* Side Nav */}
      <div className="rm-card" style={{ padding: '10px 6px', alignSelf: 'start' }}>
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`rm-nav-item${activeSection === s.key ? ' active' : ''}`}
            style={{ marginBottom: 2 }}
          >
            <span className="nav-icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
        <hr style={{ borderColor: 'var(--divider)', margin: '8px 0' }} />
        <button className="rm-nav-item" onClick={handleLogout} style={{ color: 'var(--rm-red)' }}>
          <span className="nav-icon"><BsBoxArrowRight /></span>
          Logout
        </button>
      </div>

      {/* Content */}
      <div>
        {activeSection === 'profile' && (
          <div className="rm-card">
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>👤 Profile Settings</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Update your personal information</p>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--rm-blue), var(--rm-navy))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, boxShadow: '0 4px 14px rgba(29,114,254,0.3)' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
            </div>

            <form onSubmit={handleProfileSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="rm-form-label">Full Name *</label>
                  <input className="rm-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} id="settings-name" />
                </div>
                <div>
                  <label className="rm-form-label">Phone</label>
                  <input className="rm-input" placeholder="9876543210" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} id="settings-phone" />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="rm-form-label">UPI ID (for payments)</label>
                <input className="rm-input" placeholder="name@upi or name@paytm" value={profile.upiId} onChange={e => setProfile(p => ({ ...p, upiId: e.target.value }))} id="settings-upi" />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Shown to your roommate for settlement payments</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label className="rm-form-label">Email</label>
                <input className="rm-input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Email cannot be changed</p>
              </div>
              <button type="submit" className="btn-rm-primary" disabled={saving} id="save-profile-btn">
                {saving ? <span className="spinner" /> : 'Save Profile'}
              </button>
            </form>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="rm-card">
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>🔒 Change Password</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Use a strong, unique password</p>
            <form onSubmit={handlePasswordChange}>
              {[
                { key: 'current', label: 'Current Password', placeholder: 'Enter current password', id: 'pw-current' },
                { key: 'newPw', label: 'New Password', placeholder: 'Min 6 characters', id: 'pw-new' },
                { key: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password', id: 'pw-confirm' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 12 }}>
                  <label className="rm-form-label">{f.label}</label>
                  <input type="password" className="rm-input" placeholder={f.placeholder} value={passwords[f.key]} onChange={e => setPasswords(p => ({ ...p, [f.key]: e.target.value }))} id={f.id} />
                </div>
              ))}
              {passwords.newPw && passwords.confirm && passwords.newPw !== passwords.confirm && (
                <div style={{ color: 'var(--rm-red)', fontSize: '0.75rem', marginBottom: 10 }}>⚠️ Passwords don't match</div>
              )}
              <button type="submit" className="btn-rm-primary" disabled={saving} id="change-password-btn">
                {saving ? <span className="spinner" /> : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="rm-card">
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>🎨 Appearance</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Customize how RoomMates looks</p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-input)', borderRadius: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: theme === 'dark' ? 'var(--rm-navy)' : 'var(--rm-sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {theme === 'dark' ? '🌙' : '☀️'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{theme === 'dark' ? 'Easy on the eyes at night' : 'Clean and bright interface'}</div>
                </div>
              </div>
              <button onClick={toggleTheme} className="btn-rm-primary" id="theme-toggle-btn">
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--rm-blue-pale)', borderRadius: 12, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              💡 Your theme preference is saved automatically in your browser.
            </div>
          </div>
        )}

        {activeSection === 'room' && (
          <div className="rm-card">
            <h5 style={{ fontWeight: 700, marginBottom: 4 }}>🏠 Room Settings</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 20 }}>Manage your current room</p>

            {room ? (
              <>
                <div style={{ background: 'var(--bg-input)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: '2rem' }}>🏠</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{room.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{room.members?.length || 1} Roommate(s) enrolled</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--rm-blue-pale)', borderRadius: 8, padding: '6px 12px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>INVITE CODE: </span>
                      <span style={{ fontWeight: 800, color: 'var(--rm-blue)', letterSpacing: 1.5 }}>{room.code}</span>
                    </div>
                    <button className="btn-rm-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => { navigator.clipboard.writeText(room.code); toast('Code copied!', 'success'); }}>
                      📋 Copy Invite Code
                    </button>
                  </div>
                </div>

                {/* Edit Room Name Form */}
                <form onSubmit={handleUpdateRoomName} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
                  <h6 style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>✏️ Rename Room</h6>
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Room / Flat Name</label>
                    <input
                      type="text"
                      className="form-control-rm"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g. Skyline Flat 402"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-rm-primary" disabled={saving} style={{ fontSize: '0.8rem', padding: '8px 16px' }}>
                    {saving ? 'Saving...' : 'Update Room Name'}
                  </button>
                </form>

                <div style={{ background: 'var(--rm-red-light)', borderRadius: 14, padding: '16px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <BsExclamationTriangleFill color="var(--rm-red)" />
                    <span style={{ fontWeight: 700, color: 'var(--rm-red)', fontSize: '0.9rem' }}>Danger Zone</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--rm-red)', margin: '0 0 12px' }}>
                    Leaving the room will remove you from all shared expenses. You will need to join or create a new room.
                  </p>
                  <button className="btn-rm-danger" onClick={handleLeaveRoom} id="leave-room-btn">
                    <BsDoorOpen /> Leave Room
                  </button>
                </div>
              </>
            ) : (
              <div className="rm-empty-state">
                <div className="rm-empty-icon">🏠</div>
                <h5>No room found</h5>
                <p>Join or create a room to get started</p>
                <button className="btn-rm-primary" style={{ margin: '12px auto 0', display: 'flex' }} onClick={() => navigate('/room-setup')}>
                  Set Up Room
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
