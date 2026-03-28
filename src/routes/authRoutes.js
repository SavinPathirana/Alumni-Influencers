const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and account management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new alumni account
 *     tags: [Authentication]
 *     security: []
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
 *                 example: StrongPass1!
 *               first_name:
 *                 type: string
 *                 example: Jane
 *               last_name:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       201:
 *         description: Registration successful. Verification email sent.
 *       400:
 *         description: Invalid input or email domain.
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /api/auth/verify/{token}:
 *   get:
 *     summary: Verify a user's email address
 *     tags: [Authentication]
 *     security: []
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
router.get('/verify/:token', authController.verifyEmail);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in to the platform
 *     tags: [Authentication]
 *     security: []
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
 *                 example: StrongPass1!
 *     responses:
 *       200:
 *         description: Login successful. Returns a JWT token.
 *       401:
 *         description: Invalid credentials.
 *       403:
 *         description: Email not verified.
 */
router.post('/login', authController.login);

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
router.post('/logout', authController.logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     tags: [Authentication]
 *     security: []
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
router.post('/forgot-password', authController.requestPasswordReset);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Authentication]
 *     security: []
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
 *                 example: NewStrongPass2@
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *       400:
 *         description: Invalid token or weak password.
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;