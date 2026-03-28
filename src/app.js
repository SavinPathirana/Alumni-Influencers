const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
require('./config/db');

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

//Security middlewares
app.use(helmet()); //Sets secure HTTP response headers
app.use(cors());
app.use(express.json()); //Parse JSON payloads

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check API health status
 *     description: Returns a success message if the API is running correctly.
 *     security: [] 
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
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const biddingRoutes = require('./routes/biddingRoutes');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/api/bids', biddingRoutes);

//Server initialization
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;