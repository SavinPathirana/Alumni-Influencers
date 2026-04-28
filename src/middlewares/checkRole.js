/**
 * Role-Based Access Control Middleware
 * Usage: router.use(checkRole('admin')) or router.get('/path', checkRole('admin', 'sponsor'), handler)
 */
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        //req.user is set by authMiddleware after JWT verification
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'Authentication required.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden. You do not have the required role to access this resource.',
                required_roles: allowedRoles,
                your_role: req.user.role
            });
        }

        next();
    };
};

module.exports = checkRole;
