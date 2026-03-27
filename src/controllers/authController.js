const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');
const { isValidUniversityEmail, isStrongPassword } = require('../utils/validators');
const jwt = require('jsonwebtoken');

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

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        //Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        //Look for the user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];

        //Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        //Email verification
        if (!user.is_verified) {
            return res.status(403).json({ error: 'Please verify your email before logging in.' });
        }

        //Generate JWT session token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN } // e.g., '24h' from your .env
        );

        res.status(200).json({
            message: 'Login successful.',
            token: token
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error during login.' });
    }
};

const logout = async (req, res) => {
    
    res.status(200).json({ 
        message: 'Logged out successfully. Client must discard the token.' 
    });
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        //Generate a secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        //Update the user record with the token
        const [result] = await pool.query(
            `UPDATE users 
             SET reset_token = ?, reset_token_expiry = DATE_ADD(NOW(), INTERVAL 1 HOUR) 
             WHERE email = ?`,
            [resetToken, email]
        );

        if (result.affectedRows > 0) {
            console.log(`Mock Email: Password reset link: /reset-password?token=${resetToken}`);
        }

        res.status(200).json({ 
            message: 'If an account with that email exists, a password reset link has been sent.' 
        });

    } catch (error) {
        console.error('Password Reset Request Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required.' });
        }

        //Validate the new password
        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({ error: 'Password does not meet strength requirements.' });
        }

        //Find the user with this token
        const [users] = await pool.query(
            `SELECT id FROM users 
             WHERE reset_token = ? AND reset_token_expiry > NOW()`,
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired password reset token.' });
        }

        const user = users[0];

        //Hash the new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        //Update the password
        await pool.query(
            `UPDATE users 
             SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL 
             WHERE id = ?`,
            [passwordHash, user.id]
        );

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    register,
    verifyEmail,
    login,
    logout,
    requestPasswordReset,
    resetPassword
    
};