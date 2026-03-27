const pool = require('../config/db');
const { isValidUrl } = require('../utils/validators');

const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId; 

        const [profiles] = await pool.query(
            'SELECT bio, linkedin_url, profile_image_url, monthly_appearance_count, has_event_bonus FROM profiles WHERE user_id = ?',
            [userId]
        );

        if (profiles.length === 0) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        res.status(200).json({ profile: profiles[0] });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const updateBaseProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { bio, linkedin_url } = req.body;

        // Validation
        if (linkedin_url && !isValidUrl(linkedin_url)) {
            return res.status(400).json({ error: 'Invalid LinkedIn URL format.' });
        }
        if (linkedin_url && !linkedin_url.includes('linkedin.com')) {
            return res.status(400).json({ error: 'URL must be a valid LinkedIn profile.' });
        }

        await pool.query(
            'UPDATE profiles SET bio = ?, linkedin_url = ? WHERE user_id = ?',
            [bio, linkedin_url, userId]
        );

        res.status(200).json({ message: 'Base profile updated successfully.' });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    getMyProfile,
    updateBaseProfile
};