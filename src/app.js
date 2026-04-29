const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { sequelize } = require('./models');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const apiLimiter = require('./middlewares/rateLimiter');
const requireApiKey = require('./middlewares/apiKeyAuth');
const errorHandler = require('./middlewares/errorHandler');
const { generateCsrfToken, validateCsrfToken } = require('./middlewares/csrfProtection');

const app = express();

//EJS view engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Serve static assets (CSS, JS, images)
app.use(express.static(path.join(__dirname, '..', 'public')));

//Security middlewares
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api', generateCsrfToken);
app.use('/api', validateCsrfToken);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true
    }
}));
app.use('/uploads', express.static('uploads'));

//Load API controllers (mounted at /api/{name})
require('./lib/boot')(app, { verbose: !module.parent });

//Load page routes (server-rendered EJS pages)
const pageRoutes = require('./routes/pages');
app.use('/', pageRoutes);

require('./utils/cronJobs');

//Server initialization
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    //Sync Sequelize models then start server
    sequelize.sync({ alter: true })
        .then(() => {
            console.log('Sequelize models synchronized with database.');
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch(err => {
            console.error('Failed to sync Sequelize models:', err);
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