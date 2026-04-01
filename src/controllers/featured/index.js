const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

/**
 * @swagger
 * tags:
 *   name: Featured
 *   description: Public endpoint for the Alumni of the Day feature
 */

//Controller Function

const getTodaysFeatured = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        //Find the winning bid for today
        const [wonBids] = await pool.query(
            `SELECT b.user_id, b.bid_amount, b.target_date,
                    u.email,
                    p.bio, p.linkedin_url, p.profile_image_url
             FROM bids b
             JOIN users u ON b.user_id = u.id
             JOIN profiles p ON p.user_id = u.id
             WHERE b.target_date = ? AND b.status = 'won'
             LIMIT 1`,
            [today]
        );

        if (wonBids.length === 0) {
            return res.status(200).json({
                date: today,
                featured: false,
                message: 'No Alumni of the Day for today.'
            });
        }

        const winner = wonBids[0];
        const profileId = (await pool.query('SELECT id FROM profiles WHERE user_id = ?', [winner.user_id]))[0][0].id;

        //Fetch all profile sections for the winner
        const [degrees] = await pool.query('SELECT title, official_url, completion_date FROM degrees WHERE profile_id = ?', [profileId]);
        const [certs] = await pool.query('SELECT title, url, completion_date FROM certifications WHERE profile_id = ?', [profileId]);
        const [licences] = await pool.query('SELECT title, url, completion_date FROM licences WHERE profile_id = ?', [profileId]);
        const [courses] = await pool.query('SELECT title, url, completion_date FROM professional_courses WHERE profile_id = ?', [profileId]);
        const [employment] = await pool.query('SELECT company, role, start_date, end_date FROM employment_history WHERE profile_id = ?', [profileId]);

        res.status(200).json({
            date: today,
            featured: true,
            alumni: {
                email: winner.email,
                bio: winner.bio,
                linkedin_url: winner.linkedin_url,
                profile_image_url: winner.profile_image_url,
                degrees,
                certifications: certs,
                licences,
                professional_courses: courses,
                employment_history: employment
            }
        });

    } catch (error) {
        console.error('Featured Alumni Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/featured/today:
 *   get:
 *     summary: Get today's featured Alumni of the Day
 *     description: Public endpoint that returns the complete profile of today's featured alumnus. No JWT required — only API key.
 *     tags: [Featured]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Today's featured alumni profile (or message if none)
 */
router.get('/today', getTodaysFeatured);

module.exports = router;
