const express = require('express');
const router = express.Router();
const { Bid, Profile, User } = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
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
        const targetMonth = new Date(target_date).getMonth() + 1;
        const targetYear = new Date(target_date).getFullYear();

        const winCount = await Bid.count({
            where: {
                user_id: userId,
                status: 'won',
                [Op.and]: [
                    literal(`MONTH(target_date) = ${targetMonth}`),
                    literal(`YEAR(target_date) = ${targetYear}`)
                ]
            }
        });

        //Check if the user has the event bonus for a 4th slot
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const hasEventBonus = profile && profile.has_event_bonus;
        const maxWins = hasEventBonus ? 4 : 3;

        if (winCount >= maxWins) {
            return res.status(403).json({
                error: `Monthly limit reached. You can only win a maximum of ${maxWins} feature slots per month.${hasEventBonus ? ' (includes event bonus)' : ''}`
            });
        }

        //Insert the Bid
        const bid = await Bid.create({
            user_id: userId, target_date, bid_amount, status: 'pending'
        });

        res.status(201).json({
            message: 'Blind bid placed successfully.',
            bidId: bid.id
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
        const existingBid = await Bid.findOne({
            where: { id: bidId, user_id: userId }
        });

        if (!existingBid) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

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

        const previousAmount = existingBid.bid_amount;
        await existingBid.update({ bid_amount });

        res.status(200).json({
            message: 'Bid updated successfully.',
            previous_amount: previousAmount,
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
        const existingBid = await Bid.findOne({
            where: { id: bidId, user_id: userId }
        });

        if (!existingBid) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

        if (existingBid.status !== 'pending') {
            return res.status(400).json({ error: 'Only pending bids can be cancelled.' });
        }

        await existingBid.destroy();

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
        const userBid = await Bid.findOne({
            where: { id: bidId, user_id: userId }
        });

        if (!userBid) {
            return res.status(404).json({ error: 'Bid not found or unauthorized.' });
        }

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
        const higherBidCount = await Bid.count({
            where: {
                target_date: userBid.target_date,
                status: 'pending',
                bid_amount: { [Op.gt]: userBid.bid_amount }
            }
        });

        const totalBidCount = await Bid.count({
            where: {
                target_date: userBid.target_date,
                status: 'pending'
            }
        });

        const isCurrentlyWinning = higherBidCount === 0;

        res.status(200).json({
            bid_id: userBid.id,
            target_date: userBid.target_date,
            your_amount: userBid.bid_amount,
            status: 'pending',
            currently_winning: isCurrentlyWinning,
            feedback: isCurrentlyWinning
                ? 'You are currently the highest bidder!'
                : 'You are not currently the highest bidder. Consider increasing your bid.',
            total_bids_for_date: totalBidCount
        });

    } catch (error) {
        console.error('Bid Status Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getMyBids = async (req, res) => {
    try {
        const userId = req.user.userId;

        const bids = await Bid.findAll({
            where: { user_id: userId },
            attributes: ['id', 'target_date', 'bid_amount', 'status', 'created_at'],
            order: [['target_date', 'DESC']]
        });

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
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const winsThisMonth = await Bid.count({
            where: {
                user_id: userId,
                status: 'won',
                [Op.and]: [
                    literal(`MONTH(target_date) = ${currentMonth}`),
                    literal(`YEAR(target_date) = ${currentYear}`)
                ]
            }
        });

        //Check event bonus
        const profile = await Profile.findOne({
            where: { user_id: userId },
            attributes: ['has_event_bonus', 'monthly_appearance_count']
        });

        const hasEventBonus = profile && profile.has_event_bonus;
        const maxWins = hasEventBonus ? 4 : 3;
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
        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

        //Check if there's already a winner for tomorrow
        const wonBid = await Bid.findOne({
            where: { target_date: tomorrowStr, status: 'won' },
            include: [{ model: User, attributes: ['email'] }]
        });

        if (wonBid) {
            return res.status(200).json({
                date: tomorrowStr,
                status: 'taken',
                message: 'Tomorrow\'s slot has already been won.',
            });
        }

        //Count pending bids for tomorrow
        const pendingCount = await Bid.count({
            where: { target_date: tomorrowStr, status: 'pending' }
        });

        res.status(200).json({
            date: tomorrowStr,
            status: 'open',
            pending_bids: pendingCount,
            message: pendingCount > 0
                ? `Tomorrow's slot is open with ${pendingCount} bid(s) placed.`
                : 'Tomorrow\'s slot is open. No bids placed yet.'
        });

    } catch (error) {
        console.error('Tomorrow Slot Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
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

module.exports = router;
