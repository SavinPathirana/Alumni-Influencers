const pool = require('../config/db');

const requireApiKey = async (req, res, next) => {
    
    const providedKey = req.header('x-api-key');

    if (!providedKey) {
        return res.status(401).json({ error: 'Access denied. Missing API Key.' });
    }

    try {
        //Check against the database for dynamically managed keys
        const [keys] = await pool.query(
            'SELECT id, client_name, is_active FROM api_keys WHERE key_value = ?',
            [providedKey]
        );

        //Also check the legacy .env key for backwards compatibility
        const envKey = process.env.AR_CLIENT_API_KEY;
        
        if (keys.length > 0) {
            const key = keys[0];

            if (!key.is_active) {
                return res.status(403).json({ error: 'Forbidden. This API key has been revoked.' });
            }

            //Log the usage asynchronously (don't block the request)
            pool.query(
                'INSERT INTO api_usage_logs (api_key_id, endpoint, method) VALUES (?, ?, ?)',
                [key.id, req.originalUrl, req.method]
            ).catch(err => console.error('Usage log error:', err));

            req.apiKeyId = key.id;
            req.clientName = key.client_name;
            next();

        } else if (providedKey === envKey) {
            //Legacy .env key still works
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