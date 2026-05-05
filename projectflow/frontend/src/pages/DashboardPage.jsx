import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, isAfter } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const priorityColors = { low: 'var(--teal)', medium: 'var(--yellow)', high: 'var(--peach)', urgent: 'var(--red)' };

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="spinner" />
    </div>
  );

  const { stats, recentTasks, overdueTasks } = data || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getTimeOfDay()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects</p>
        </div>
        <Link to="/projects" className="btn btn-primary">+ New Project</Link>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Stats */}
        <div className="stats-grid">
          <StatCard label="Total Projects" value={stats?.totalProjects || 0} sub="active workspaces" color="var(--blue)" />
          <StatCard label="Total Tasks" value={stats?.totalTasks || 0} sub="across all projects" color="var(--mauve)" />
          <StatCard label="My Tasks" value={stats?.myTasks || 0} sub="assigned to me" color="var(--lavender)" />
          <StatCard label="Completed" value={stats?.completed || 0} sub={`${stats?.totalTasks ? Math.round((stats.completed / stats.totalTasks) * 100) : 0}% of total`} color="var(--green)" />
          <StatCard label="In Progress" value={stats?.inProgress || 0} sub="actively working" color="var(--yellow)" />
          <StatCard label="Overdue" value={stats?.overdue || 0} sub="need attention" color={stats?.overdue > 0 ? 'var(--red)' : 'var(--green)'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Recent Activity</h3>
              <Link to="/my-tasks" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentTasks?.length ? recentTasks.slice(0, 6).map(task => (
                <Link to={`/projects/${task.project?._id}`} key={task._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background 0.15s', background: 'var(--base)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface0)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--base)'}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: priorityColors[task.priority], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.6 : 1 }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--overlay1)' }}>{task.project?.name}</div>
                  </div>
                  <span className={`badge badge-${task.status}`}>{statusLabel[task.status]}</span>
                </Link>
              )) : <div className="empty-state" style={{ padding: '30px 0' }}><p className="empty-desc">No tasks yet. Create a project to get started.</p></div>}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>⚠️ Overdue Tasks</h3>
              <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{overdueTasks?.length || 0} tasks</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdueTasks?.length ? overdueTasks.map(task => (
                <Link to={`/projects/${task.project?._id}`} key={task._id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 8, textDecoration: 'none', background: 'rgba(243,139,168,0.05)', border: '1px solid rgba(243,139,168,0.2)' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{task.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                      Due {format(new Date(task.dueDate), 'MMM d')} · {task.project?.name}
                    </div>
                  </div>
                  {task.assignee && (
                    <div className="member-avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                      {task.assignee.name[0]}
                    </div>
                  )}
                </Link>
              )) : (
                <div className="empty-state" style={{ padding: '30px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p className="empty-desc">No overdue tasks! Great work.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={{ color }}>{value}</div>
      <div className="stat-card-sub">{sub}</div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
