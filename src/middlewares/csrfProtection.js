const crypto = require('crypto');

//Generate or refresh CSRF token
const generateCsrfToken = (req, res, next) => {
    //Only generate for browser sessions (cookie-based auth)
    const cookies = parseCookies(req.headers.cookie);
    if (cookies['token'] && !cookies['csrf_token']) {
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.setHeader('Set-Cookie', [
            `csrf_token=${csrfToken}; Path=/; Max-Age=86400; SameSite=Strict`
        ].join(''));
        req.csrfToken = csrfToken;
    } else {
        req.csrfToken = cookies['csrf_token'] || null;
    }
    next();
};

//Validate CSRF token on state-changing requests
const validateCsrfToken = (req, res, next) => {
    //Only enforce on state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }

    //Skip CSRF for API-key-only requests (external consumers)
    //They authenticate via x-api-key header, not browser cookies
    if (req.headers['x-api-key'] && !req.headers.cookie) {
        return next();
    }

    //Skip CSRF for Bearer-only requests (Swagger, Postman)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ') && !req.headers.cookie) {
        return next();
    }

    //Skip for login/register/verify (user doesn't have a session yet)
    const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/logout',
        '/api/auth/forgot-password', '/api/auth/reset-password'];
    if (skipPaths.some(p => req.path.startsWith(p))) {
        return next();
    }
    if (req.path.startsWith('/api/auth/verify/')) {
        return next();
    }

    //For cookie-based browser sessions, validate the CSRF token
    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies['csrf_token'];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken) {
        return next(); //No CSRF cookie = likely API consumer, allow through
    }

    if (cookieToken !== headerToken) {
        return res.status(403).json({ error: 'CSRF token mismatch. Please refresh the page.' });
    }

    next();
};

//Cookie parser helper
function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return cookieHeader.split(';').reduce((acc, item) => {
        const parts = item.split('=');
        if (parts.length >= 2) acc[parts[0].trim()] = decodeURIComponent(parts[1].trim());
        return acc;
    }, {});
}

module.exports = { generateCsrfToken, validateCsrfToken };
