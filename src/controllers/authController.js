const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { isValidUniversityEmail, isStrongPassword } = require('../utils/validators');

const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        //Input validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        if (!isValidUniversityEmail(email)) {
            return res.status(400).json({ error: 'Must use a valid university email domain (.ac.uk).' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password does not meet strength requirements.' });
        }

        //Duplicate checking
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        //Bcrypt hashing
        const saltRounds = 12; 
        const passwordHash = await bcrypt.hash(password, saltRounds);

        //Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        //Save to database
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

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;

        //Find the user with the token
        const [users] = await pool.query(
            'SELECT id, created_at FROM users WHERE verification_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or already used verification token.' });
        }

        const user = users[0];

        //Token expiry check
        const tokenAgeHours = (new Date() - new Date(user.created_at)) / (1000 * 60 * 60);
        if (tokenAgeHours > 24) {
            return res.status(400).json({ error: 'Verification token has expired. Please register again.' });
        }

        //Mark user as verified and clear the token
        await pool.query(
            'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = ?',
            [user.id]
        );

        res.status(200).json({ message: 'Email successfully verified. You can now log in.' });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Internal server error during verification.' });
    }
};

module.exports = {
    register,
    verifyEmail
};