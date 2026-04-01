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

        //3-Win Monthly Limit Rule (with event bonus support)
        const [winCheck] = await pool.query(
            `SELECT COUNT(*) as winCount 
             FROM bids 
             WHERE user_id = ? 
             AND status = 'won' 
             AND MONTH(target_date) = MONTH(?) 
             AND YEAR(target_date) = YEAR(?)`,
            [userId, target_date, target_date]
        );

        //Check if the user has the event bonus for a 4th slot
        const [profileCheck] = await pool.query(
            'SELECT has_event_bonus FROM profiles WHERE user_id = ?',
            [userId]
        );
        const hasEventBonus = profileCheck.length > 0 && profileCheck[0].has_event_bonus;
        const maxWins = hasEventBonus ? 4 : 3;

        if (winCheck[0].winCount >= maxWins) {
            return res.status(403).json({
                error: `Monthly limit reached. You can only win a maximum of ${maxWins} feature slots per month.${hasEventBonus ? ' (includes event bonus)' : ''}`
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

const updateBid = async (req, res) => {
    try {
        const userId = req.user.userId;
        const bidId = req.params.id;
        const { bid_amount } = req.body;

        if (!bid_amount) {
            return res.status(400).json({ error: 'New bid amount is required.' });
        }

        //Get the existing bid
        const [existingBids] = await pool.query(
            'SELECT * FROM bids WHERE id = ? AND user_id = ?',
            [bidId, userId]
        );

        if (existingBids.length === 0) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

        const existingBid = existingBids[0];

        //Can only update pending bids
        if (existingBid.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending bids can be updated.' });
        }

        //Can only increase the bid amount
        if (bid_amount <= existingBid.bid_amount) {
            return res.status(400).json({ 
                error: `New bid amount must be higher than the current amount (£${existingBid.bid_amount}).` 
            });
        }

        await pool.query(
            'UPDATE bids SET bid_amount = ? WHERE id = ?',
            [bid_amount, bidId]
        );

        res.status(200).json({ 
            message: 'Bid updated successfully.',
            previous_amount: existingBid.bid_amount,
            new_amount: bid_amount
        });

    } catch (error) {
        console.error('Update Bid Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const cancelBid = async (req, res) => {
    try {
        const userId = req.user.userId;
        const bidId = req.params.id;

        //Check that bid exists and belongs to the user
        const [existingBids] = await pool.query(
            'SELECT * FROM bids WHERE id = ? AND user_id = ?',
            [bidId, userId]
        );

        if (existingBids.length === 0) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

        if (existingBids[0].status !== 'pending') {
            return res.status(400).json({ error: 'Only pending bids can be cancelled.' });
        }

        await pool.query('DELETE FROM bids WHERE id = ?', [bidId]);

        res.status(200).json({ message: 'Bid cancelled successfully.' });

    } catch (error) {
        console.error('Cancel Bid Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getBidStatus = async (req, res) => {
    try {
        const userId = req.user.userId;
        const bidId = req.params.id;

        //Get the user's bid
        const [userBids] = await pool.query(
            'SELECT * FROM bids WHERE id = ? AND user_id = ?',
            [bidId, userId]
        );

        if (userBids.length === 0) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

        const userBid = userBids[0];

        //If already resolved, return the final status
        if (userBid.status !== 'pending') {
            return res.status(200).json({
                bid_id: userBid.id,
                target_date: userBid.target_date,
                your_amount: userBid.bid_amount,
                status: userBid.status,
                feedback: userBid.status === 'won' ? 'Congratulations! You won this slot.' : 'You did not win this slot.'
            });
        }

        //For pending bids, check if they are currently the highest WITHOUT revealing the actual highest amount
        const [higherBids] = await pool.query(
            `SELECT COUNT(*) as count FROM bids 
             WHERE target_date = ? AND status = 'pending' AND bid_amount > ?`,
            [userBid.target_date, userBid.bid_amount]
        );

        const [totalBids] = await pool.query(
            `SELECT COUNT(*) as count FROM bids 
             WHERE target_date = ? AND status = 'pending'`,
            [userBid.target_date]
        );

        const isCurrentlyWinning = higherBids[0].count === 0;

        res.status(200).json({
            bid_id: userBid.id,
            target_date: userBid.target_date,
            your_amount: userBid.bid_amount,
            status: 'pending',
            currently_winning: isCurrentlyWinning,
            feedback: isCurrentlyWinning 
                ? 'You are currently the highest bidder!' 
                : 'You are not currently the highest bidder. Consider increasing your bid.',
            total_bids_for_date: totalBids[0].count
        });

    } catch (error) {
        console.error('Bid Status Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
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

const getMonthlyStatus = async (req, res) => {
    try {
        const userId = req.user.userId;

        //Count wins this month
        const [winCheck] = await pool.query(
            `SELECT COUNT(*) as winCount 
             FROM bids 
             WHERE user_id = ? 
             AND status = 'won' 
             AND MONTH(target_date) = MONTH(CURDATE()) 
             AND YEAR(target_date) = YEAR(CURDATE())`,
            [userId]
        );

        //Check event bonus
        const [profileCheck] = await pool.query(
            'SELECT has_event_bonus, monthly_appearance_count FROM profiles WHERE user_id = ?',
            [userId]
        );

        const hasEventBonus = profileCheck.length > 0 && profileCheck[0].has_event_bonus;
        const maxWins = hasEventBonus ? 4 : 3;
        const winsThisMonth = winCheck[0].winCount;
        const remainingSlots = Math.max(0, maxWins - winsThisMonth);

        res.status(200).json({
            wins_this_month: winsThisMonth,
            max_wins_allowed: maxWins,
            remaining_slots: remainingSlots,
            has_event_bonus: hasEventBonus,
            can_bid: remainingSlots > 0
        });

    } catch (error) {
        console.error('Monthly Status Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getTomorrowSlot = async (req, res) => {
    try {
        //Calculate tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        //Check if there's already a winner for tomorrow
        const [wonBids] = await pool.query(
            `SELECT b.id, b.bid_amount, u.email 
             FROM bids b JOIN users u ON b.user_id = u.id 
             WHERE b.target_date = ? AND b.status = 'won'`,
            [tomorrowStr]
        );

        if (wonBids.length > 0) {
            return res.status(200).json({
                date: tomorrowStr,
                status: 'taken',
                message: 'Tomorrow\'s slot has already been won.',
            });
        }

        //Count pending bids for tomorrow
        const [pendingBids] = await pool.query(
            `SELECT COUNT(*) as count FROM bids WHERE target_date = ? AND status = 'pending'`,
            [tomorrowStr]
        );

        res.status(200).json({
            date: tomorrowStr,
            status: 'open',
            pending_bids: pendingBids[0].count,
            message: pendingBids[0].count > 0 
                ? `Tomorrow's slot is open with ${pendingBids[0].count} bid(s) placed.`
                : 'Tomorrow\'s slot is open. No bids placed yet.'
        });

    } catch (error) {
        console.error('Tomorrow Slot Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const resolveBids = async (req, res) => {
    try {
        const { target_date } = req.body;

        if (!target_date) {
            return res.status(400).json({ error: 'Target date is required to resolve bids.' });
        }

        //Find all pending bids for this specific date
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

        //Increment the winner's monthly appearance count
        await pool.query(
            'UPDATE profiles SET monthly_appearance_count = monthly_appearance_count + 1 WHERE user_id = ?',
            [winningBid.user_id]
        );

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
 * /api/bidding/monthly-status:
 *   get:
 *     summary: View monthly bid status (X/3 wins and event bonus)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Monthly bidding status with remaining slots
 */
router.get('/monthly-status', getMonthlyStatus);

/**
 * @swagger
 * /api/bidding/tomorrow:
 *   get:
 *     summary: Check tomorrow's featured slot availability
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Tomorrow's slot status (open/taken)
 */
router.get('/tomorrow', getTomorrowSlot);

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
 * /api/bidding/{id}/status:
 *   get:
 *     summary: Check if you are winning or losing a specific bid (blind feedback)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The bid ID
 *     responses:
 *       200:
 *         description: Bid status with winning/losing feedback (without revealing highest bid)
 *       404:
 *         description: Bid not found
 */
router.get('/:id/status', getBidStatus);

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
 *         description: Monthly win limit reached
 */
router.post('/', placeBid);

/**
 * @swagger
 * /api/bidding/{id}:
 *   put:
 *     summary: Update a bid (increase amount only)
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bid_amount
 *             properties:
 *               bid_amount:
 *                 type: number
 *                 example: 75.00
 *     responses:
 *       200:
 *         description: Bid updated successfully
 *       400:
 *         description: New amount must be higher than current
 */
router.put('/:id', updateBid);

/**
 * @swagger
 * /api/bidding/{id}:
 *   delete:
 *     summary: Cancel a pending bid
 *     tags: [Bidding]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bid cancelled successfully
 *       400:
 *         description: Only pending bids can be cancelled
 */
router.delete('/:id', cancelBid);

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
 *         description: Bids resolved. Returns the winner.
 *       400:
 *         description: Missing target_date
 */
router.post('/resolve', resolveBids);

module.exports = router;
