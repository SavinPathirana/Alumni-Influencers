const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { isValidUniversityEmail, isStrongPassword } = require('../utils/validators');

const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        //Input Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        if (!isValidUniversityEmail(email)) {
            return res.status(400).json({ error: 'Must use a valid university email domain (.ac.uk).' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password does not meet strength requirements.' });
        }

        //Duplicate Checking
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        //Bcrypt hashing
        const saltRounds = 12; 
        const passwordHash = await bcrypt.hash(password, saltRounds);

        //Generate Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        //Save to Database
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, verification_token) VALUES (?, ?, ?)',
            [email, passwordHash, verificationToken]
        );

        //Create empty profile for the user
        await pool.query('INSERT INTO profiles (user_id) VALUES (?)', [result.insertId]);

        console.log(`Mock Email: Send verification token ${verificationToken} to ${email}`);

        res.status(201).json({ 
            message: 'Registration successful. Please check your email to verify your account.' 
        });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error during registration.' });
    }
};

module.exports = {
    register
};