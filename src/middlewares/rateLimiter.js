const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, //1 hour in milliseconds
    max: 100, //Limit each IP to 100 requests
    message: { 
        error: 'Too many requests from this IP. The AR Client is restricted to 100 requests per hour. Please try again later.' 
    },
    standardHeaders: true, //Return info in the `RateLimit-*` headers
    legacyHeaders: false, //Disable the `X-RateLimit-*` headers
});

module.exports = apiLimiter;