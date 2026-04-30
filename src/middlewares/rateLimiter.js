const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, //15 minutes in milliseconds
    max: 100, //Limit each IP to 100 requests per 15 minutes
    message: {
        error: 'Too many requests from this IP. The AR Client is restricted to 100 requests per 15 minutes. Please try again later.'
    },
    standardHeaders: true, //Return info in the `RateLimit-*` headers
    legacyHeaders: false, //Disable the `X-RateLimit-*` headers
});

module.exports = apiLimiter;