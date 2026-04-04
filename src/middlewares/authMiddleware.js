const jwt = require('jsonwebtoken');

//Cookie Parser
const parseCookies = (cookieHeader) => {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((cookies, item) => {
        const parts = item.split('=');
        if (parts.length >= 2) {
            cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
        }
        return cookies;
    }, {});
};

const authenticateToken = (req, res, next) => {
    // Extract token from HttpOnly cookie first
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies['token'];

    //Fallback to the standard Authorization header
    if (!token) {
        const authHeader = req.headers['authorization'];
        token = authHeader && authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        //Verifying the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //Attach the decoded user payload to the request object
        req.user = decoded;

        //Move to the next
        next();
    } catch (error) {
        //Invalid or expired token
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authenticateToken;