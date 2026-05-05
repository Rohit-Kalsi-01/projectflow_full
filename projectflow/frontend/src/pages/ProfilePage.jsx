import React, { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>

      <div className="page-body" style={{ maxWidth: 520 }}>
        {/* Avatar */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div className="sidebar-avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
            {form.avatar ? <img src={form.avatar} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initials}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
            <div style={{ fontSize: 14, color: 'var(--subtext0)' }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--overlay1)', marginTop: 4 }}>Member since {new Date(user?.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'long' })}</div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Profile</h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
              <span className="form-error">Email cannot be changed</span>
            </div>
            <div className="form-group">
              <label className="form-label">Avatar URL</label>
              <input className="form-input" placeholder="https://..." value={form.avatar}
                onChange={e => setForm({ ...form, avatar: e.target.value })} />
              <span style={{ fontSize: 12, color: 'var(--overlay1)' }}>Paste a direct image URL</span>
            </div>
            <div style={{ paddingTop: 4 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
