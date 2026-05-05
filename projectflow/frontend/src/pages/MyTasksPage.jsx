import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import api from '../utils/api';

const statusColors = { todo: 'var(--overlay2)', in_progress: 'var(--blue)', review: 'var(--yellow)', done: 'var(--green)' };
const statusLabels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/tasks/my').then(res => setTasks(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>;

  const now = new Date();
  const filtered = tasks.filter(t => {
    if (filter === 'active') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    if (filter === 'overdue') return t.dueDate && new Date(t.dueDate) < now && t.status !== 'done';
    return true;
  });

  const byProject = filtered.reduce((acc, t) => {
    const pid = t.project?._id;
    if (!acc[pid]) acc[pid] = { project: t.project, tasks: [] };
    acc[pid].tasks.push(t);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{tasks.length} task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface0)', padding: 3, borderRadius: 10, width: 'fit-content', marginBottom: 24 }}>
          {[['all', 'All'], ['active', 'Active'], ['overdue', 'Overdue'], ['done', 'Done']].map(([val, label]) => (
            <button key={val} className={`tab-btn${filter === val ? ' active' : ''}`}
              onClick={() => setFilter(val)} style={{ flex: 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3 className="empty-title">No tasks here</h3>
            <p className="empty-desc">{filter === 'overdue' ? 'No overdue tasks. Great job!' : 'No tasks found for this filter.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.values(byProject).map(({ project, tasks: pts }) => (
              <div key={project?._id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: project?.color || 'var(--mauve)' }} />
                  <Link to={`/projects/${project?._id}`} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                    {project?.name || 'Unknown Project'}
                  </Link>
                  <span style={{ fontSize: 12, color: 'var(--overlay1)' }}>{pts.length} task{pts.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pts.map(task => <TaskRow key={task._id} task={task} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <div className="task-item" style={{ cursor: 'default' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[task.status], flexShrink: 0, marginTop: 5 }} />
      <div className="task-body">
        <div className="task-title" style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.6 : 1 }}>{task.title}</div>
        <div className="task-meta">
          <span className={`badge badge-${task.status}`}>{statusLabels[task.status]}</span>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          {task.dueDate && (
            <span className={`task-due${isOverdue ? ' overdue' : ''}`}>
              {isOverdue ? '⚠ ' : ''}Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
