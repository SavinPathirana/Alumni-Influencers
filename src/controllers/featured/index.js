const express = require('express');
const router = express.Router();
const { Bid, User, Profile, Degree, Certification, Licence, ProfessionalCourse, Employment } = require('../../models');

/**
 * @swagger
 * tags:
 *   name: Featured
 *   description: Public endpoint for the Alumni of the Day feature
 */

//Controller Function

const getTodaysFeatured = async (req, res) => {
    try {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        //Find the winning bid for today with eager loaded user and profile
        const wonBid = await Bid.findOne({
            where: { target_date: today, status: 'won' },
            include: [{
                model: User,
                attributes: ['id', 'email'],
                include: [{
                    model: Profile,
                    attributes: ['id', 'bio', 'linkedin_url', 'profile_image_url'],
                    include: [
                        { model: Degree, attributes: ['title', 'official_url', 'completion_date'] },
                        { model: Certification, attributes: ['title', 'url', 'completion_date'] },
                        { model: Licence, attributes: ['title', 'url', 'completion_date'] },
                        { model: ProfessionalCourse, attributes: ['title', 'url', 'completion_date'] },
                        { model: Employment, attributes: ['company', 'role', 'start_date', 'end_date'] }
                    ]
                }]
            }]
        });

        if (!wonBid) {
            return res.status(200).json({
                date: today,
                featured: false,
                message: 'No Alumni of the Day for today.'
            });
        }

        const user = wonBid.User;
        const profile = user.Profile;

        res.status(200).json({
            date: today,
            featured: true,
            alumni: {
                email: user.email,
                bio: profile.bio,
                linkedin_url: profile.linkedin_url,
                profile_image_url: profile.profile_image_url,
                degrees: profile.Degrees,
                certifications: profile.Certifications,
                licences: profile.Licences,
                professional_courses: profile.ProfessionalCourses,
                employment_history: profile.Employments
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
