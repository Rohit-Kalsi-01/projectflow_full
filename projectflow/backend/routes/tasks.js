const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');
const { projectAccess, requireAdmin } = require('../middleware/projectRole');

const router = express.Router();

// GET /api/tasks/my - get all tasks assigned to current user
router.get('/my', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ assignee: req.user._id })
      .populate('project', 'name color')
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks/dashboard - dashboard stats for current user
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Projects the user belongs to
    const projects = await Project.find({
      $or: [{ owner: userId }, { 'members.user': userId }]
    });
    const projectIds = projects.map(p => p._id);

    const allTasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name color')
      .populate('assignee', 'name email avatar');

    const myTasks = allTasks.filter(t => t.assignee && t.assignee._id.toString() === userId.toString());
    const now = new Date();

    const stats = {
      totalProjects: projects.length,
      totalTasks: allTasks.length,
      myTasks: myTasks.length,
      completed: allTasks.filter(t => t.status === 'done').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      overdue: allTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length,
      myOverdue: myTasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'done').length
    };

    const recentTasks = await Task.find({ project: { $in: projectIds } })
      .populate('project', 'name color')
      .populate('assignee', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(10);

    const overdueTasks = await Task.find({
      project: { $in: projectIds },
      dueDate: { $lt: now },
      status: { $ne: 'done' }
    })
      .populate('project', 'name color')
      .populate('assignee', 'name email avatar')
      .sort({ dueDate: 1 })
      .limit(5);

    res.json({ stats, recentTasks, overdueTasks });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks/project/:projectId
router.get('/project/:projectId', auth, projectAccess, async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    const filter = { project: req.params.projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/tasks/project/:projectId
router.post('/project/:projectId', auth, projectAccess, [
  body('title').trim().notEmpty().withMessage('Task title is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { title, description, priority, assignee, dueDate, tags } = req.body;
    const task = new Task({
      title, description, priority,
      assignee: assignee || null,
      dueDate,
      tags: tags || [],
      project: req.params.projectId,
      createdBy: req.user._id
    });
    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('project', 'name color members owner')
      .populate('comments.user', 'name email avatar');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Check access
    const project = task.project;
    const userId = req.user._id.toString();
    const isOwner = project.owner.toString() === userId;
    const isMember = project.members.some(m => m.user.toString() === userId);
    if (!isOwner && !isMember) return res.status(403).json({ message: 'Access denied' });

    const { title, description, status, priority, assignee, dueDate, tags } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (assignee !== undefined) task.assignee = assignee || null;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (tags !== undefined) task.tags = tags;

    await task.save();
    await task.populate('assignee', 'name email avatar');
    await task.populate('createdBy', 'name email avatar');
    res.json(task);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const project = task.project;
    const userId = req.user._id.toString();
    const isOwner = project.owner.toString() === userId;
    const isAdmin = project.members.some(m => m.user.toString() === userId && m.role === 'admin');
    const isCreator = task.createdBy.toString() === userId;

    if (!isOwner && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', auth, [
  body('text').trim().notEmpty().withMessage('Comment text required')
], async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email avatar');
    res.json(task.comments[task.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
