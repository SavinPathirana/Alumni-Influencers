const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
require('./config/db');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiLimiter = require('./middlewares/rateLimiter');
const requireApiKey = require('./middlewares/apiKeyAuth');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

//Security middlewares
app.use(helmet()); //Secure HTTP response headers
app.use(cors());
app.use(express.json()); //Parse JSON payloads

//XSS Protections
app.use((req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript\s*:/gi, '')
                    .replace(/on\w+\s*=/gi, ''); //Strip inline handlers
            }
        }
    }
    next();
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     description: Returns a success message if the API is running correctly.
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Alumni API is running securely.
 */

//Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Alumni API is running securely.' });
});

app.use('/api', apiLimiter);
app.use('/api', requireApiKey);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true
    }
}));
app.use('/uploads', express.static('uploads'));

//Load controllers
require('./lib/boot')(app, { verbose: !module.parent });

require('./utils/cronJobs');

//Server initialization
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

app.use((req, res, next) => {
    const error = new Error(`Route not found: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
});

//The Error Handler
app.use(errorHandler);

module.exports = app;