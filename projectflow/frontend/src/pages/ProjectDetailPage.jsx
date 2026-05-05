import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--overlay2)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--blue)' },
  { key: 'review', label: 'Review', color: 'var(--yellow)' },
  { key: 'done', label: 'Done', color: 'var(--green)' },
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const priorityColors = { low: 'var(--teal)', medium: 'var(--yellow)', high: 'var(--peach)', urgent: 'var(--red)' };

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const load = useCallback(() => {
    api.get(`/projects/${id}`)
      .then(res => setProject(res.data))
      .catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>;
  if (!project) return null;

  const isAdmin = project.userRole === 'admin';
  const allMembers = [{ user: project.owner, role: 'admin' }, ...project.members];
  const tasks = project.tasks || [];

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      load();
    } catch { toast.error('Failed to update task'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Task deleted');
      load();
    } catch { toast.error('Failed to delete task'); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Delete "${project.name}" and all its tasks?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch { toast.error('Failed to delete project'); }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: project.color, flexShrink: 0 }} />
          <div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle">{project.description}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="member-stack">
            {allMembers.slice(0, 5).map((m, i) => (
              <div key={m.user._id} className="member-avatar" title={m.user.name}>{m.user.name?.[0]?.toUpperCase()}</div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowMembersModal(true)}>
            👥 {allMembers.length} member{allMembers.length !== 1 ? 's' : ''}
          </button>
          {isAdmin && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Task</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
            </>
          )}
          {!isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Task</button>}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: '12px 32px', display: 'flex', gap: 20, borderBottom: '1px solid var(--surface0)' }}>
        {COLUMNS.map(col => (
          <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
            <span style={{ fontSize: 13, color: 'var(--subtext0)' }}>{col.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{tasksByStatus[col.key]?.length || 0}</span>
          </div>
        ))}
        {project.stats?.overdue > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>⚠ {project.stats.overdue} overdue</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '16px 32px 0', borderBottom: '1px solid var(--surface0)' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {['board', 'list', 'members'].map(tab => (
            <button key={tab} className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)} style={{ flex: 'none', textTransform: 'capitalize' }}>
              {tab === 'board' ? '⊞ Board' : tab === 'list' ? '≡ List' : '👥 Members'}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {activeTab === 'board' && (
          <div className="kanban-board">
            {COLUMNS.map(col => (
              <div key={col.key} className="kanban-column">
                <div className="kanban-col-header">
                  <span className="kanban-col-title" style={{ color: col.color }}>{col.label}</span>
                  <span className="kanban-col-count">{tasksByStatus[col.key]?.length || 0}</span>
                </div>
                {tasksByStatus[col.key]?.map(task => (
                  <KanbanTask key={task._id} task={task} allMembers={allMembers} isAdmin={isAdmin}
                    userId={user._id} onEdit={() => { setEditingTask(task); setShowTaskModal(true); }}
                    onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
                ))}
                <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 6, color: 'var(--overlay1)' }}
                  onClick={() => { setEditingTask({ defaultStatus: col.key }); setShowTaskModal(true); }}>
                  + Add task
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <h3 className="empty-title">No tasks yet</h3>
                <p className="empty-desc">Create your first task to get started.</p>
              </div>
            ) : tasks.map(task => (
              <ListTask key={task._id} task={task} isAdmin={isAdmin} userId={user._id}
                onEdit={() => { setEditingTask(task); setShowTaskModal(true); }}
                onStatusChange={handleStatusChange} onDelete={handleDeleteTask} />
            ))}
          </div>
        )}

        {activeTab === 'members' && (
          <MembersTab project={project} isAdmin={isAdmin} onUpdate={load} />
        )}
      </div>

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          project={project}
          allMembers={allMembers}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={load}
        />
      )}

      {showMembersModal && (
        <MembersModal project={project} isAdmin={isAdmin} onClose={() => setShowMembersModal(false)} onUpdate={load} />
      )}
    </div>
  );
}

function KanbanTask({ task, isAdmin, userId, onEdit, onStatusChange, onDelete }) {
  const isOwner = task.createdBy?._id === userId || task.createdBy === userId;
  const nextStatus = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' };
  const nextLabel = { todo: '▶ Start', in_progress: '→ Review', review: '✓ Done', done: '↺ Reopen' };
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div className="kanban-task">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <p className="kanban-task-title">{task.title}</p>
        {(isAdmin || isOwner) && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button className="btn btn-ghost btn-icon" style={{ padding: 3, fontSize: 12 }} onClick={onEdit} title="Edit">✎</button>
            <button className="btn btn-ghost btn-icon" style={{ padding: 3, fontSize: 12, color: 'var(--red)' }} onClick={() => onDelete(task._id)} title="Delete">✕</button>
          </div>
        )}
      </div>
      <div className="kanban-task-footer">
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {isOverdue && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>OVERDUE</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {task.dueDate && <span style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--overlay1)' }}>{format(new Date(task.dueDate), 'MMM d')}</span>}
          {task.assignee && <div className="member-avatar" style={{ width: 22, height: 22, fontSize: 9 }} title={task.assignee.name}>{task.assignee.name?.[0]}</div>}
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }}
            onClick={() => onStatusChange(task._id, nextStatus[task.status])}>
            {nextLabel[task.status]}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListTask({ task, isAdmin, userId, onEdit, onStatusChange, onDelete }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <div className="task-item">
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
          <span style={{ fontSize: 14, fontWeight: 500, textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.6 : 1 }}>{task.title}</span>
        </div>
        <div className="task-meta" style={{ marginTop: 4 }}>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.dueDate && <span className={`task-due${isOverdue ? ' overdue' : ''}`}>Due {format(new Date(task.dueDate), 'MMM d, yyyy')}</span>}
          {task.assignee && <span style={{ fontSize: 12, color: 'var(--subtext0)' }}>→ {task.assignee.name}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>✎ Edit</button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => onDelete(task._id)}>✕</button>
      </div>
    </div>
  );
}

function MembersTab({ project, isAdmin, onUpdate }) {
  const allMembers = [{ user: project.owner, role: 'admin', isOwner: true }, ...project.members];

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${project._id}/members/${userId}`);
      toast.success('Member removed');
      onUpdate();
    } catch { toast.error('Failed to remove member'); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/projects/${project._id}/members/${userId}`, { role });
      toast.success('Role updated');
      onUpdate();
    } catch { toast.error('Failed to update role'); }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="members-list">
        {allMembers.map((m) => (
          <div key={m.user._id} className="member-row">
            <div className="member-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{m.user.name?.[0]?.toUpperCase()}</div>
            <div className="member-info">
              <div className="member-name">{m.user.name}</div>
              <div className="member-email">{m.user.email}</div>
            </div>
            <span className={`badge badge-${m.role}`}>{m.role}</span>
            {isAdmin && !m.isOwner && (
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="form-select" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                  value={m.role} onChange={e => handleRoleChange(m.user._id, e.target.value)}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleRemove(m.user._id)}>✕</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersModal({ project, isAdmin, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${project._id}/members`, { email, role });
      toast.success('Member added!');
      setEmail('');
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Team Members</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {isAdmin && (
            <form onSubmit={handleInvite} style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Email address" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required style={{ flex: 1 }} />
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)} style={{ width: 110 }}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" type="submit" disabled={loading}>Add</button>
            </form>
          )}
          <MembersTab project={project} isAdmin={isAdmin} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
}

function TaskModal({ task, project, allMembers, onClose, onSaved }) {
  const isEditing = task && task._id;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || task?.defaultStatus || 'todo',
    priority: task?.priority || 'medium',
    assignee: task?.assignee?._id || task?.assignee || '',
    dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const payload = { ...form, assignee: form.assignee || null };
      if (isEditing) {
        await api.put(`/tasks/${task._id}`, payload);
        toast.success('Task updated!');
      } else {
        await api.post(`/tasks/project/${project._id}`, payload);
        toast.success('Task created!');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" placeholder="Task title" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Describe the task..." value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })}>
                  <option value="">Unassigned</option>
                  {allMembers.map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate}
                  onChange={e => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
