const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user || !allowedRoles.includes(req.user.user_role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  };
  
  module.exports = checkRole;