import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BsHouseFill, BsPlusLg, BsKeyFill, BsArrowRight } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const RoomSetup = () => {
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [roomName, setRoomName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshRoom } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return toast('Room name is required', 'warning');
    setLoading(true);
    try {
      const res = await api.post('/api/rooms', { name: roomName.trim() });
      await refreshRoom();
      toast(`Room "${res.data.room.name}" created! Invite code: ${res.data.room.code}`, 'success', 'Room Created 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return toast('Invite code is required', 'warning');
    setLoading(true);
    try {
      await api.post('/api/rooms/join', { code: inviteCode.trim().toUpperCase() });
      await refreshRoom();
      toast('Joined the room successfully!', 'success', 'Welcome! 🏠');
      navigate('/dashboard');
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid invite code', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rm-auth-page" style={{ flexDirection: 'column', gap: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--rm-blue), var(--rm-navy))', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(29,114,254,0.35)' }}>
          <BsHouseFill size={26} color="white" />
        </div>
        <h2 style={{ fontWeight: 800, marginBottom: 6 }}>Set up your room</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Create a new room or join an existing one with your roommate</p>
      </div>

      {!mode ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480, width: '100%' }}>
          <div className="room-setup-card" onClick={() => setMode('create')} id="create-room-card">
            <div className="room-setup-icon" style={{ background: 'var(--rm-blue-pale)' }}>
              <BsPlusLg color="var(--rm-blue)" />
            </div>
            <h5 style={{ fontWeight: 700, marginBottom: 6 }}>Create Room</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Start a new shared room and invite your roommate</p>
          </div>

          <div className="room-setup-card" onClick={() => setMode('join')} id="join-room-card">
            <div className="room-setup-icon" style={{ background: 'var(--rm-orange-light)' }}>
              <BsKeyFill color="var(--rm-orange)" />
            </div>
            <h5 style={{ fontWeight: 700, marginBottom: 6 }}>Join Room</h5>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Enter an invite code to join your roommate's room</p>
          </div>
        </div>
      ) : mode === 'create' ? (
        <div className="rm-auth-card" style={{ maxWidth: 420 }}>
          <h5 style={{ fontWeight: 700, marginBottom: 20 }}>🏠 Create a New Room</h5>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: 16 }}>
              <label className="rm-form-label">Room Name *</label>
              <input className="rm-input" placeholder="e.g. Flat 402 - Green Glen" value={roomName} onChange={e => setRoomName(e.target.value)} id="room-name-input" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-rm-outline" onClick={() => setMode(null)} style={{ flex: 1 }}>Back</button>
              <button type="submit" className="btn-rm-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading} id="create-room-btn">
                {loading ? <span className="spinner" /> : <><span>Create Room</span><BsArrowRight /></>}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rm-auth-card" style={{ maxWidth: 420 }}>
          <h5 style={{ fontWeight: 700, marginBottom: 20 }}>🔑 Join a Room</h5>
          <form onSubmit={handleJoin}>
            <div style={{ marginBottom: 16 }}>
              <label className="rm-form-label">Invite Code *</label>
              <input
                className="rm-input"
                placeholder="RM-XXXXXX"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                style={{ letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}
                id="invite-code-input"
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Ask your roommate for their room's invite code</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-rm-outline" onClick={() => setMode(null)} style={{ flex: 1 }}>Back</button>
              <button type="submit" className="btn-rm-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading} id="join-room-btn">
                {loading ? <span className="spinner" /> : <><span>Join Room</span><BsArrowRight /></>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RoomSetup;
