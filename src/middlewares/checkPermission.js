const checkPermission = (requiredScope) => {
    return (req, res, next) => {
        const permissions = req.apiPermissions || [];

        //No permissions attached, allow access
        if (permissions.length === 0 && req.legacyKey) {
            return next();
        }

        //Check if the key has the required scope
        if (!permissions.includes(requiredScope)) {
            return res.status(403).json({
                error: 'Forbidden. Your API key does not have the required permission.',
                required_scope: requiredScope,
                your_scopes: permissions
            });
        }

        next();
    };
};

module.exports = checkPermission;
