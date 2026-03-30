const requireApiKey = (req, res, next) => {
    
    const providedKey = req.header('x-api-key');
    const validKey = process.env.AR_CLIENT_API_KEY;

    if (!providedKey) {
        return res.status(401).json({ error: 'Access denied. Missing API Key.' });
    }

    if (providedKey !== validKey) {
        return res.status(403).json({ error: 'Forbidden. Invalid API Key.' });
    }

    //Check whether the key matches
    next();
};

module.exports = requireApiKey;