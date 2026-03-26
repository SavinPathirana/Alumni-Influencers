const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();
require('./config/db');

const app = express();

//Security Middlewares
app.use(helmet()); //Sets secure HTTP response headers
app.use(cors());
app.use(express.json()); //Parse JSON payloads

//Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Alumni API is running securely.' });
});
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

//Server Initialization
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;