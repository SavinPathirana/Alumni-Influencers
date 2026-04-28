const express = require('express');
const router = express.Router();
const { User, SponsorshipOffer, Bid } = require('../../models');
const { fn, col } = require('sequelize');
const authenticateToken = require('../../middlewares/authMiddleware');
const checkRole = require('../../middlewares/checkRole');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Alumni wallet balance and sponsorship backing
 */

//All wallet routes require alumni authentication
router.use(authenticateToken);
router.use(checkRole('alumni'));

//Controller Functions

const getWallet = async (req, res) => {
    try {
        const userId = req.user.userId;

        //Get the user's wallet balance
        const user = await User.findByPk(userId, {
            attributes: ['id', 'wallet_balance']
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        //Calculate total accepted sponsorship backing (only 'accepted', not 'used')
        const sponsorshipBacking = await SponsorshipOffer.sum('offer_amount', {
            where: {
                user_id: userId,
                status: 'accepted'
            }
        }) || 0;

        //Calculate funds reserved by pending bids
        const pendingBidReservation = await Bid.sum('bid_amount', {
            where: {
                user_id: userId,
                status: 'pending'
            }
        }) || 0;

        const walletBalance = parseFloat(user.wallet_balance);
        const backing = parseFloat(sponsorshipBacking);
        const reserved = parseFloat(pendingBidReservation);
        const totalAvailable = walletBalance + backing - reserved;

        res.status(200).json({
            wallet_balance: walletBalance,
            sponsorship_backing: backing,
            pending_bid_reservation: reserved,
            total_available: Math.max(0, totalAvailable),
            accepted_offers: await SponsorshipOffer.count({
                where: { user_id: userId, status: 'accepted' }
            }),
            pending_offers: await SponsorshipOffer.count({
                where: { user_id: userId, status: 'pending' }
            }),
            used_offers: await SponsorshipOffer.count({
                where: { user_id: userId, status: 'used' }
            })
        });

    } catch (error) {
        console.error('Wallet Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get wallet balance, sponsorship backing, and total available funds
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Wallet details including balance and sponsorship backing
 */
router.get('/', getWallet);

module.exports = router;
