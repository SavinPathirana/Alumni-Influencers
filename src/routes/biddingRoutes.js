const express = require('express');
const router = express.Router();
const biddingController = require('../controllers/biddingController');
const authenticateToken = require('../middlewares/authMiddleware');

//Secure all bidding routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Bidding
 *   description: Blind bidding system for daily feature slots
 */

/**
 * @swagger
 * /api/bids:
 *   post:
 *     summary: Place a blind bid for a future date
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_date
 *               - bid_amount
 *             properties:
 *               target_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-15"
 *               bid_amount:
 *                 type: number
 *                 example: 50.00
 *     responses:
 *       201:
 *         description: Bid placed successfully
 *       403:
 *         description: Monthly win limit (3) reached
 */
router.post('/', biddingController.placeBid);

/**
 * @swagger
 * /api/bids/me:
 *   get:
 *     summary: Get logged-in user's bid history
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of user's bids
 */
router.get('/me', biddingController.getMyBids);

/**
 * @swagger
 * /api/bids/resolve:
 *   post:
 *     summary: Resolve bids for a specific date (Finds the highest bidder)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - target_date
 *             properties:
 *               target_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-15"
 *     responses:
 *       200:
 *         description: Bids successfully resolved. Returns the winning user.
 *       400:
 *         description: Missing target_date.
 */
router.post('/resolve', biddingController.resolveBids);

module.exports = router;