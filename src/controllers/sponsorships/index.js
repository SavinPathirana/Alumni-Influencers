const express = require('express');
const router = express.Router();
const { SponsorshipOffer, Sponsor, User, Profile, Certification, Licence, ProfessionalCourse } = require('../../models');
const authenticateToken = require('../../middlewares/authMiddleware');
const checkRole = require('../../middlewares/checkRole');

/**
 * @swagger
 * tags:
 *   name: Sponsorships
 *   description: Sponsorship offer management for sponsors and alumni
 */

//All sponsorship routes require authentication
router.use(authenticateToken);

//Controller Functions

/**
 * Get sponsorship offers.
 * Alumni: see offers made TO them.
 * Sponsors: see offers made BY their organization.
 */
const getOffers = async (req, res) => {
    try {
        const userId = req.user.userId;
        const role = req.user.role;

        let whereClause;
        let includeClause;

        if (role === 'sponsor') {
            //Find the sponsor organization linked to this user
            const sponsor = await Sponsor.findOne({ where: { user_id: userId } });
            if (!sponsor) {
                return res.status(404).json({ error: 'No sponsor organization linked to your account.' });
            }
            whereClause = { sponsor_id: sponsor.id };
            includeClause = [
                { model: User, attributes: ['id', 'email'] },
                { model: Sponsor, attributes: ['id', 'name', 'logo_url'] }
            ];
        } else {
            //Alumni see offers made to them
            whereClause = { user_id: userId };
            includeClause = [
                { model: Sponsor, attributes: ['id', 'name', 'logo_url'] }
            ];
        }

        const offers = await SponsorshipOffer.findAll({
            where: whereClause,
            include: includeClause,
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({ offers });

    } catch (error) {
        console.error('Get Offers Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Sponsor creates a new sponsorship offer for an alumni user's credential.
 */
const createOffer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { alumni_user_id, credential_type, credential_id, offer_amount } = req.body;

        //Validate input
        if (!alumni_user_id || !credential_type || !credential_id || !offer_amount) {
            return res.status(400).json({ error: 'alumni_user_id, credential_type, credential_id, and offer_amount are required.' });
        }

        if (offer_amount <= 0) {
            return res.status(400).json({ error: 'Offer amount must be greater than zero.' });
        }

        const validTypes = ['Certification', 'Licence', 'ProfessionalCourse'];
        if (!validTypes.includes(credential_type)) {
            return res.status(400).json({ error: `credential_type must be one of: ${validTypes.join(', ')}` });
        }

        //Find the sponsor organization linked to this user
        const sponsor = await Sponsor.findOne({ where: { user_id: userId } });
        if (!sponsor) {
            return res.status(404).json({ error: 'No sponsor organization linked to your account.' });
        }

        //Verify the alumni user exists and is an alumni
        const alumniUser = await User.findOne({ where: { id: alumni_user_id, role: 'alumni' } });
        if (!alumniUser) {
            return res.status(404).json({ error: 'Alumni user not found.' });
        }

        //Verify the credential exists for this user
        const profile = await Profile.findOne({ where: { user_id: alumni_user_id } });
        if (!profile) {
            return res.status(404).json({ error: 'Alumni profile not found.' });
        }

        let credentialModel;
        if (credential_type === 'Certification') credentialModel = Certification;
        else if (credential_type === 'Licence') credentialModel = Licence;
        else credentialModel = ProfessionalCourse;

        const credential = await credentialModel.findOne({
            where: { id: credential_id, profile_id: profile.id }
        });
        if (!credential) {
            return res.status(404).json({ error: `${credential_type} with ID ${credential_id} not found for this alumni.` });
        }

        //Create the offer
        const offer = await SponsorshipOffer.create({
            sponsor_id: sponsor.id,
            user_id: alumni_user_id,
            credential_type,
            credential_id,
            offer_amount,
            status: 'pending'
        });

        res.status(201).json({
            message: 'Sponsorship offer created successfully.',
            offer_id: offer.id
        });

    } catch (error) {
        console.error('Create Offer Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Alumni accepts a pending sponsorship offer.
 */
const acceptOffer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const offerId = req.params.id;

        const offer = await SponsorshipOffer.findOne({
            where: { id: offerId, user_id: userId }
        });

        if (!offer) {
            return res.status(404).json({ error: 'Offer not found or unauthorized.' });
        }

        if (offer.status !== 'pending') {
            return res.status(400).json({ error: `Offer is already ${offer.status}.` });
        }

        await offer.update({ status: 'accepted' });

        res.status(200).json({ message: 'Sponsorship offer accepted.' });

    } catch (error) {
        console.error('Accept Offer Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

/**
 * Alumni rejects a pending sponsorship offer.
 */
const rejectOffer = async (req, res) => {
    try {
        const userId = req.user.userId;
        const offerId = req.params.id;

        const offer = await SponsorshipOffer.findOne({
            where: { id: offerId, user_id: userId }
        });

        if (!offer) {
            return res.status(404).json({ error: 'Offer not found or unauthorized.' });
        }

        if (offer.status !== 'pending') {
            return res.status(400).json({ error: `Offer is already ${offer.status}.` });
        }

        await offer.update({ status: 'rejected' });

        res.status(200).json({ message: 'Sponsorship offer rejected.' });

    } catch (error) {
        console.error('Reject Offer Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/sponsorships/offers:
 *   get:
 *     summary: Get sponsorship offers (role-aware — alumni see their offers, sponsors see offers they created)
 *     tags: [Sponsorships]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of sponsorship offers
 */
router.get('/offers', getOffers);

/**
 * @swagger
 * /api/sponsorships/offers:
 *   post:
 *     summary: Create a sponsorship offer for an alumni's credential (sponsor only)
 *     tags: [Sponsorships]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [alumni_user_id, credential_type, credential_id, offer_amount]
 *             properties:
 *               alumni_user_id:
 *                 type: integer
 *                 example: 5
 *               credential_type:
 *                 type: string
 *                 enum: [Certification, Licence, ProfessionalCourse]
 *                 example: Certification
 *               credential_id:
 *                 type: integer
 *                 example: 12
 *               offer_amount:
 *                 type: number
 *                 example: 300.00
 *     responses:
 *       201:
 *         description: Offer created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Alumni or credential not found
 */
router.post('/offers', checkRole('sponsor'), createOffer);

/**
 * @swagger
 * /api/sponsorships/offers/{id}/accept:
 *   post:
 *     summary: Accept a pending sponsorship offer (alumni only)
 *     tags: [Sponsorships]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sponsorship offer ID
 *     responses:
 *       200:
 *         description: Offer accepted
 *       404:
 *         description: Offer not found
 */
router.post('/offers/:id/accept', checkRole('alumni'), acceptOffer);

/**
 * @swagger
 * /api/sponsorships/offers/{id}/reject:
 *   post:
 *     summary: Reject a pending sponsorship offer (alumni only)
 *     tags: [Sponsorships]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Sponsorship offer ID
 *     responses:
 *       200:
 *         description: Offer rejected
 *       404:
 *         description: Offer not found
 */
router.post('/offers/:id/reject', checkRole('alumni'), rejectOffer);

module.exports = router;
