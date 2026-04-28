const { ApiKey, ApiUsageLog } = require('../models');
const jwt = require('jsonwebtoken');

const requireApiKey = async (req, res, next) => {

    //Skip API key check if a valid JWT Bearer token is present.
    //This allows internal JWT-authenticated routes (sponsorships, wallet, keys, auth)
    //to work without an API key, while external analytics consumers still need one.
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            //Valid JWT — grant all permissions and skip API key check
            req.apiPermissions = ['read:alumni', 'read:analytics', 'read:alumni_of_day'];
            req.jwtAuthenticated = true;
            return next();
        } catch (e) {
            //Invalid JWT — fall through to API key check
        }
    }

    //Also check for JWT in cookies (HttpOnly cookie set at login)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, item) => {
            const parts = item.split('=');
            if (parts.length >= 2) acc[parts[0].trim()] = parts[1].trim();
            return acc;
        }, {});
        if (cookies['token']) {
            try {
                jwt.verify(cookies['token'], process.env.JWT_SECRET);
                req.apiPermissions = ['read:alumni', 'read:analytics', 'read:alumni_of_day'];
                req.jwtAuthenticated = true;
                return next();
            } catch (e) {
                //Invalid cookie JWT — fall through to API key check
            }
        }
    }

    const providedKey = req.header('x-api-key');

    if (!providedKey) {
        return res.status(401).json({ error: 'Access denied. Missing API Key.' });
    }

    try {
        //Check against the database for dynamically managed keys
        const key = await ApiKey.findOne({ where: { key_value: providedKey } });

        //Also check the legacy .env key for backwards compatibility
        const envKey = process.env.AR_CLIENT_API_KEY;
        
        if (key) {
            if (!key.is_active) {
                return res.status(403).json({ error: 'Forbidden. This API key has been revoked.' });
            }

            //Log the usage asynchronously (don't block the request)
            ApiUsageLog.create({
                api_key_id: key.id,
                endpoint: req.originalUrl,
                method: req.method
            }).catch(err => console.error('Usage log error:', err));

            req.apiKeyId = key.id;
            req.clientName = key.client_name;
            req.apiPermissions = key.permissions || [];
            next();

        } else if (providedKey === envKey) {
            //Legacy .env key still works — grant all permissions
            req.legacyKey = true;
            req.apiPermissions = ['read:alumni', 'read:analytics', 'read:alumni_of_day'];
            next();

        } else {
            return res.status(403).json({ error: 'Forbidden. Invalid API Key.' });
        }

    } catch (error) {
        console.error('API Key Auth Error:', error);
        //Fallback to .env key if database is unavailable
        if (providedKey === process.env.AR_CLIENT_API_KEY) {
            next();
        } else {
            return res.status(500).json({ error: 'Internal server error during authentication.' });
        }
    }
};

module.exports = requireApiKey;