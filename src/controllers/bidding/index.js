const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const authenticateToken = require('../../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Bidding
 *   description: Blind bidding system for daily feature slots
 */

//Secure all bidding routes
router.use(authenticateToken);

//Controller Functions
const placeBid = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { target_date, bid_amount } = req.body;

        //Basic Validation
        if (!target_date || !bid_amount) {
            return res.status(400).json({ error: 'Target date and bid amount are required.' });
        }
        if (bid_amount <= 0) {
            return res.status(400).json({ error: 'Bid amount must be greater than zero.' });
        }

        const targetDateObj = new Date(target_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (targetDateObj <= today) {
            return res.status(400).json({ error: 'Bids can only be placed for future dates.' });
        }

        //3-Win Monthly Limit Rule
        const [winCheck] = await pool.query(
            `SELECT COUNT(*) as winCount 
             FROM bids 
             WHERE user_id = ? 
             AND status = 'won' 
             AND MONTH(target_date) = MONTH(?) 
             AND YEAR(target_date) = YEAR(?)`,
            [userId, target_date, target_date]
        );

        if (winCheck[0].winCount >= 3) {
            return res.status(403).json({
                error: 'Monthly limit reached. You can only win a maximum of 3 feature slots per month.'
            });
        }

        //Insert the Bid
        const [result] = await pool.query(
            'INSERT INTO bids (user_id, target_date, bid_amount, status) VALUES (?, ?, ?, ?)',
            [userId, target_date, bid_amount, 'pending']
        );

        res.status(201).json({
            message: 'Blind bid placed successfully.',
            bidId: result.insertId
        });

    } catch (error) {
        console.error('Place Bid Error:', error);
        res.status(500).json({ error: 'Internal server error while placing bid.' });
    }
};

const getMyBids = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [bids] = await pool.query(
            'SELECT id, target_date, bid_amount, status, created_at FROM bids WHERE user_id = ? ORDER BY target_date DESC',
            [userId]
        );

        res.status(200).json({ bids });

    } catch (error) {
        console.error('Get Bids Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const resolveBids = async (req, res) => {
    try {
        const { target_date } = req.body;

        if (!target_date) {
            return res.status(400).json({ error: 'Target date is required to resolve bids.' });
        }

        //Find all pending bids for this specific date.
        const [pendingBids] = await pool.query(
            `SELECT id, user_id, bid_amount 
             FROM bids 
             WHERE target_date = ? AND status = 'pending' 
             ORDER BY bid_amount DESC, created_at ASC`,
            [target_date]
        );

        if (pendingBids.length === 0) {
            return res.status(200).json({ message: `No pending bids found for ${target_date}.` });
        }

        const winningBid = pendingBids[0];

        //Extract the IDs of the losing bids
        const losingBidIds = pendingBids.slice(1).map(bid => bid.id);

        //Mark the highest bid as 'won'
        await pool.query(
            `UPDATE bids SET status = 'won' WHERE id = ?`,
            [winningBid.id]
        );

        //Mark remaining bids for this date as 'lost'
        if (losingBidIds.length > 0) {
            const placeholders = losingBidIds.map(() => '?').join(',');
            await pool.query(
                `UPDATE bids SET status = 'lost' WHERE id IN (${placeholders})`,
                losingBidIds
            );
        }

        res.status(200).json({
            message: `Bids resolved for ${target_date}.`,
            winner_user_id: winningBid.user_id,
            winning_amount: winningBid.bid_amount,
            total_bids_processed: pendingBids.length
        });

    } catch (error) {
        console.error('Resolve Bids Error:', error);
        res.status(500).json({ error: 'Internal server error while resolving bids.' });
    }
};

//Routes

/**
 * @swagger
 * /api/bidding:
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
router.post('/', placeBid);

/**
 * @swagger
 * /api/bidding/me:
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
router.get('/me', getMyBids);

/**
 * @swagger
 * /api/bidding/resolve:
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
router.post('/resolve', resolveBids);

module.exports = router;
