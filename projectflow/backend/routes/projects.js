const express = require('express');
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { projectAccess, requireAdmin } = require('../middleware/projectRole');

const router = express.Router();

// GET /api/projects - get all projects for current user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Attach task stats
    const projectsWithStats = await Promise.all(projects.map(async (p) => {
      const tasks = await Task.find({ project: p._id });
      const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        review: tasks.filter(t => t.status === 'review').length,
        done: tasks.filter(t => t.status === 'done').length,
        overdue: tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length
      };
      return { ...p.toObject(), stats };
    }));

    res.json(projectsWithStats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects - create project
router.post('/', auth, [
  body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, color, dueDate } = req.body;
    const project = new Project({
      name, description, color: color || '#6366f1', dueDate,
      owner: req.user._id,
      members: []
    });
    await project.save();
    await project.populate('owner', 'name email avatar');
    res.status(201).json({ ...project.toObject(), stats: { total: 0, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', auth, projectAccess, async (req, res) => {
  const tasks = await Task.find({ project: req.project._id })
    .populate('assignee', 'name email avatar')
    .populate('createdBy', 'name email avatar')
    .sort({ createdAt: -1 });

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.dueDate && t.dueDate < new Date() && t.status !== 'done').length
  };

  res.json({ ...req.project.toObject(), tasks, stats, userRole: req.projectRole });
});

// PUT /api/projects/:id
router.put('/:id', auth, projectAccess, requireAdmin, [
  body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, color, status, dueDate } = req.body;
    Object.assign(req.project, { name, description, color, status, dueDate });
    await req.project.save();
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', auth, projectAccess, requireAdmin, async (req, res) => {
  try {
    await Task.deleteMany({ project: req.project._id });
    await req.project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/projects/:id/members - invite member by email
router.post('/:id/members', auth, projectAccess, requireAdmin, [
  body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, role } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User not found' });

    const alreadyMember = req.project.members.some(
      m => m.user._id.toString() === userToAdd._id.toString()
    );
    if (alreadyMember || req.project.owner._id.toString() === userToAdd._id.toString()) {
      return res.status(400).json({ message: 'User already in project' });
    }

    req.project.members.push({ user: userToAdd._id, role: role || 'member' });
    await req.project.save();
    await req.project.populate('members.user', 'name email avatar');
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/projects/:id/members/:userId - update member role
router.put('/:id/members/:userId', auth, projectAccess, requireAdmin, async (req, res) => {
  try {
    const member = req.project.members.find(
      m => m.user._id.toString() === req.params.userId
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    member.role = req.body.role || member.role;
    await req.project.save();
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', auth, projectAccess, requireAdmin, async (req, res) => {
  try {
    req.project.members = req.project.members.filter(
      m => m.user._id.toString() !== req.params.userId
    );
    await req.project.save();
    res.json(req.project);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
