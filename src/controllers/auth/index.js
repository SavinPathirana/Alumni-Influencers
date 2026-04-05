const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, Profile } = require('../../models');
const { isValidUniversityEmail, isStrongPassword } = require('../../utils/validators');
const jwt = require('jsonwebtoken');
const sendMail = require('../../utils/mailer');
const { Op } = require('sequelize');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and account management
 */

//Controller Functions
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
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email is already registered.' });
        }

        //Bcrypt hashing
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        //Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        //Save to database
        const user = await User.create({
            email,
            password_hash: passwordHash,
            verification_token: verificationToken
        });

        //Create empty profile for the user
        await Profile.create({ user_id: user.id });

        //Send verification email
        await sendMail(
            email,
            'Verify Your Alumni Influencers Account',
            `Your verification token is: ${verificationToken}`,
            `<h2>Welcome to Alumni Influencers!</h2>
             <p>Use the following token to verify your account:</p>
             <p style="font-size:18px;font-weight:bold;background:#f0f4f8;padding:12px;border-radius:6px;word-break:break-all;">${verificationToken}</p>
             <p><em>This token expires in 24 hours.</em></p>`
        );

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
        const user = await User.findOne({ where: { verification_token: token } });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or already used verification token.' });
        }

        //Token expiry check
        const tokenAgeHours = (new Date() - new Date(user.created_at)) / (1000 * 60 * 60);
        if (tokenAgeHours > 24) {
            return res.status(400).json({ error: 'Verification token has expired. Please register again.' });
        }

        //Mark user as verified and clear the token
        await user.update({ is_verified: true, verification_token: null });

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
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

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
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        //Set the token as an HttpOnly cookie
        res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`);

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
    //Destroy the session cookie
    res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');

    res.status(200).json({
        message: 'Logged out successfully. Session cookie has been destroyed.'
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
        const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);
        const [updatedCount] = await User.update(
            { reset_token: resetToken, reset_token_expiry: resetExpiry },
            { where: { email } }
        );

        if (updatedCount > 0) {
            //Send password reset email
            await sendMail(
                email,
                'Password Reset - Alumni Influencers',
                `Your password reset token is: ${resetToken}`,
                `<h2>Password Reset Request</h2>
                 <p>Use the following token to reset your password:</p>
                 <p style="font-size:18px;font-weight:bold;background:#f0f4f8;padding:12px;border-radius:6px;word-break:break-all;">${resetToken}</p>
                 <p><em>This token expires in 1 hour. If you did not request this, ignore this email.</em></p>`
            );
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
        const user = await User.findOne({
            where: {
                reset_token: token,
                reset_token_expiry: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired password reset token.' });
        }

        //Hash the new password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);

        //Update the password
        await user.update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expiry: null
        });

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        console.error('Password Reset Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new alumni account
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@my.westminster.ac.uk
 *               password:
 *                 type: string
 *                 example: Password@123
 *               first_name:
 *                 type: string
 *                 example: Firstname
 *               last_name:
 *                 type: string
 *                 example: Lastname
 *     responses:
 *       201:
 *         description: Registration successful. Verification email sent.
 *       400:
 *         description: Invalid input or email domain.
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/verify/{token}:
 *   get:
 *     summary: Verify a user's email address
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: The verification token sent to the user's email
 *     responses:
 *       200:
 *         description: Email successfully verified.
 *       400:
 *         description: Invalid or expired token.
 */
router.get('/verify/:token', verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to the platform
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@my.westminster.ac.uk
 *               password:
 *                 type: string
 *                 example: Password@123
 *     responses:
 *       200:
 *         description: Login successful. Returns a JWT token.
 *       401:
 *         description: Invalid credentials.
 *       403:
 *         description: Email not verified.
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out of the platform
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully.
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: student@my.westminster.ac.uk
 *     responses:
 *       200:
 *         description: Reset link generated if email exists.
 */
router.post('/forgot-password', requestPasswordReset);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Authentication]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token received from the forgot-password email
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Invalid token or weak password.
 */
router.post('/reset-password', resetPassword);

module.exports = router;
