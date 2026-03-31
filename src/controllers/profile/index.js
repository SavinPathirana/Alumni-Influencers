const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { isValidUrl } = require('../../utils/validators');
const authenticateToken = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

//Secure profile routes
router.use(authenticateToken);

//Controller Functions

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

        //Validation
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

const getDegrees = async (req, res) => {
    try {
        const userId = req.user.userId;

        //JOIN to get degrees of the user
        const [degrees] = await pool.query(
            `SELECT d.* FROM degrees d
             JOIN profiles p ON d.profile_id = p.id
             WHERE p.user_id = ?`,
            [userId]
        );

        res.status(200).json({ degrees });
    } catch (error) {
        console.error('Get Degrees Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const addDegree = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, official_url, completion_date } = req.body;

        if (!title || !official_url || !completion_date) {
            return res.status(400).json({ error: 'Title, official URL, and completion date are required.' });
        }
        if (!isValidUrl(official_url)) {
            return res.status(400).json({ error: 'Invalid URL format for official degree page.' });
        }

        //ID for the user
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found.' });
        const profileId = profiles[0].id;

        //Insert the degree
        const [result] = await pool.query(
            'INSERT INTO degrees (profile_id, title, official_url, completion_date) VALUES (?, ?, ?, ?)',
            [profileId, title, official_url, completion_date]
        );

        res.status(201).json({ message: 'Degree added successfully.', degreeId: result.insertId });
    } catch (error) {
        console.error('Add Degree Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const updateDegree = async (req, res) => {
    try {
        const userId = req.user.userId;
        const degreeId = req.params.id;
        const { title, official_url, completion_date } = req.body;

        if (official_url && !isValidUrl(official_url)) {
            return res.status(400).json({ error: 'Invalid URL format.' });
        }

        //Get ID
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const profileId = profiles[0].id;

        //Update if the degree belongs to the profile
        const [result] = await pool.query(
            'UPDATE degrees SET title = COALESCE(?, title), official_url = COALESCE(?, official_url), completion_date = COALESCE(?, completion_date) WHERE id = ? AND profile_id = ?',
            [title, official_url, completion_date, degreeId, profileId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Degree not found or unauthorized.' });
        }

        res.status(200).json({ message: 'Degree updated successfully.' });
    } catch (error) {
        console.error('Update Degree Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const deleteDegree = async (req, res) => {
    try {
        const userId = req.user.userId;
        const degreeId = req.params.id;

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const profileId = profiles[0].id;

        //Delete if it belongs to the profile
        const [result] = await pool.query(
            'DELETE FROM degrees WHERE id = ? AND profile_id = ?',
            [degreeId, profileId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Degree not found or unauthorized.' });
        }

        res.status(200).json({ message: 'Degree deleted successfully.' });
    } catch (error) {
        console.error('Delete Degree Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getCertifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [certifications] = await pool.query(
            `SELECT c.* FROM certifications c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = ?`,
            [userId]
        );
        res.status(200).json({ certifications });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const addCertification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;

        if (!title || !url || !completion_date) return res.status(400).json({ error: 'Missing required fields.' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL format.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'INSERT INTO certifications (profile_id, title, url, completion_date) VALUES (?, ?, ?, ?)',
            [profiles[0].id, title, url, completion_date]
        );
        res.status(201).json({ message: 'Certification added.', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const updateCertification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const certId = req.params.id;
        const { title, url, completion_date } = req.body;

        if (url && !isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'UPDATE certifications SET title = COALESCE(?, title), url = COALESCE(?, url), completion_date = COALESCE(?, completion_date) WHERE id = ? AND profile_id = ?',
            [title, url, completion_date, certId, profiles[0].id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Certification updated.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const deleteCertification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query('DELETE FROM certifications WHERE id = ? AND profile_id = ?', [req.params.id, profiles[0].id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Certification deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getLicences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [licences] = await pool.query(
            `SELECT l.* FROM licences l JOIN profiles p ON l.profile_id = p.id WHERE p.user_id = ?`, [userId]
        );
        res.status(200).json({ licences });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (!title || !url || !completion_date) return res.status(400).json({ error: 'Missing fields.' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'INSERT INTO licences (profile_id, title, url, completion_date) VALUES (?, ?, ?, ?)',
            [profiles[0].id, title, url, completion_date]
        );
        res.status(201).json({ message: 'Licence added.', id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (url && !isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'UPDATE licences SET title = COALESCE(?, title), url = COALESCE(?, url), completion_date = COALESCE(?, completion_date) WHERE id = ? AND profile_id = ?',
            [title, url, completion_date, req.params.id, profiles[0].id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Licence updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query('DELETE FROM licences WHERE id = ? AND profile_id = ?', [req.params.id, profiles[0].id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Licence deleted.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const getCourses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [courses] = await pool.query(
            `SELECT c.* FROM professional_courses c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = ?`, [userId]
        );
        res.status(200).json({ courses });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (!title || !url || !completion_date) return res.status(400).json({ error: 'Missing fields.' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'INSERT INTO professional_courses (profile_id, title, url, completion_date) VALUES (?, ?, ?, ?)',
            [profiles[0].id, title, url, completion_date]
        );
        res.status(201).json({ message: 'Course added.', id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (url && !isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'UPDATE professional_courses SET title = COALESCE(?, title), url = COALESCE(?, url), completion_date = COALESCE(?, completion_date) WHERE id = ? AND profile_id = ?',
            [title, url, completion_date, req.params.id, profiles[0].id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Course updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query('DELETE FROM professional_courses WHERE id = ? AND profile_id = ?', [req.params.id, profiles[0].id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Course deleted.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const getEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [employment] = await pool.query(
            `SELECT e.* FROM employment_history e JOIN profiles p ON e.profile_id = p.id WHERE p.user_id = ?`, [userId]
        );
        res.status(200).json({ employment });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { company, role, start_date, end_date } = req.body;
        if (!company || !role || !start_date) return res.status(400).json({ error: 'Company, role, and start_date required.' });

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'INSERT INTO employment_history (profile_id, company, role, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
            [profiles[0].id, company, role, start_date, end_date || null]
        );
        res.status(201).json({ message: 'Employment added.', id: result.insertId });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { company, role, start_date, end_date } = req.body;

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query(
            'UPDATE employment_history SET company = COALESCE(?, company), role = COALESCE(?, role), start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date) WHERE id = ? AND profile_id = ?',
            [company, role, start_date, end_date, req.params.id, profiles[0].id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Employment updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const [result] = await pool.query('DELETE FROM employment_history WHERE id = ? AND profile_id = ?', [req.params.id, profiles[0].id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Employment deleted.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload an image file.' });
        }

        const userId = req.user.userId;
        const imageUrl = `/uploads/profiles/${req.file.filename}`;

        await pool.query(
            'UPDATE profiles SET profile_image_url = ? WHERE user_id = ?',
            [imageUrl, userId]
        );

        res.status(200).json({
            message: 'Profile image uploaded successfully.',
            profile_image_url: imageUrl
        });
    } catch (error) {
        console.error('Image Upload Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

router.get('/me', getMyProfile);
router.put('/me', updateBaseProfile);
router.get('/me/degrees', getDegrees);
router.post('/me/degrees', addDegree);
router.put('/me/degrees/:id', updateDegree);
router.delete('/me/degrees/:id', deleteDegree);
router.get('/me/certifications', getCertifications);
router.post('/me/certifications', addCertification);
router.put('/me/certifications/:id', updateCertification);
router.delete('/me/certifications/:id', deleteCertification);
router.get('/me/licences', getLicences);
router.post('/me/licences', addLicence);
router.put('/me/licences/:id', updateLicence);
router.delete('/me/licences/:id', deleteLicence);
router.get('/me/professional-courses', getCourses);
router.post('/me/professional-courses', addCourse);
router.put('/me/professional-courses/:id', updateCourse);
router.delete('/me/professional-courses/:id', deleteCourse);
router.get('/me/employment', getEmployment);
router.post('/me/employment', addEmployment);
router.put('/me/employment/:id', updateEmployment);
router.delete('/me/employment/:id', deleteEmployment);
router.post('/me/image', upload.single('profileImage'), uploadProfileImage);

module.exports = router;
