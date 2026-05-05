const Project = require('../models/Project');

// Attach project and user's role to req
const projectAccess = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId || req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const userId = req.user._id.toString();
    const isOwner = project.owner._id.toString() === userId;
    const member = project.members.find(m => m.user._id.toString() === userId);

    if (!isOwner && !member) {
      return res.status(403).json({ message: 'Access denied: not a project member' });
    }

    req.project = project;
    req.projectRole = isOwner ? 'admin' : member.role;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.projectRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { projectAccess, requireAdmin };
