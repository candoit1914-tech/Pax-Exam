export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
};

export const sameSchool = async (req, res, next) => {
  if (req.user.role === 'super_admin') return next();
  const schoolId = parseInt(req.params.schoolId || req.body.school_id || req.query.school_id);
  if (schoolId && schoolId !== req.user.school_id) {
    return res.status(403).json({ error: 'Cross-school access denied.' });
  }
  next();
};
