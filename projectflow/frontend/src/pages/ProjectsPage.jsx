import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const COLORS = ['#cba6f7', '#89b4fa', '#74c7ec', '#a6e3a1', '#f9e2af', '#fab387', '#f38ba8', '#f5c2e7'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    api.get('/projects').then(res => setProjects(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      <div className="page-body">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <h3 className="empty-title">No projects yet</h3>
            <p className="empty-desc">Create your first project to start organizing tasks and collaborating with your team.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => <ProjectCard key={p._id} project={p} onUpdate={load} />)}
          </div>
        )}
      </div>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} onCreated={(p) => { setProjects([p, ...projects]); setShowModal(false); }} />}
    </div>
  );
}

function ProjectCard({ project: p, onUpdate }) {
  const progress = p.stats.total > 0 ? Math.round((p.stats.done / p.stats.total) * 100) : 0;
  const allMembers = [p.owner, ...p.members.map(m => m.user)];

  return (
    <Link to={`/projects/${p._id}`} className="project-card" style={{ '--color': p.color }}>
      <div className="project-card-header">
        <span className="project-card-name">{p.name}</span>
        <span className={`badge badge-${p.status}`}>{p.status}</span>
      </div>
      {p.description && <p className="project-card-desc" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.description}</p>}

      <div className="project-progress">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--subtext0)', marginBottom: 6 }}>
          <span>{p.stats.done}/{p.stats.total} tasks</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${progress}%`, background: p.color }} />
        </div>
      </div>

      <div className="project-card-meta">
        <div className="member-stack">
          {allMembers.slice(0, 4).map((m, i) => (
            <div key={m._id || i} className="member-avatar" title={m.name}>{m.name?.[0]?.toUpperCase()}</div>
          ))}
          {allMembers.length > 4 && <div className="member-avatar" style={{ background: 'var(--surface0)', color: 'var(--subtext0)' }}>+{allMembers.length - 4}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--overlay1)' }}>
          {p.stats.overdue > 0 && <span style={{ color: 'var(--red)' }}>⚠ {p.stats.overdue} overdue</span>}
          {p.dueDate && <span>Due {format(new Date(p.dueDate), 'MMM d')}</span>}
        </div>
      </div>
    </Link>
  );
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0], dueDate: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">New Project</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Project Name *</label>
              <input className="form-input" placeholder="e.g. Website Redesign" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="What's this project about?" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm({ ...form, color: c })}
                    style={{ width: 28, height: 28, borderRadius: 8, background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '3px solid transparent', transition: 'all 0.15s' }} />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
