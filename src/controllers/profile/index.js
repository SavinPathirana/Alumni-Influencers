const express = require('express');
const router = express.Router();
const pool = require('../../config/db');
const { isValidUrl } = require('../../utils/validators');
const authenticateToken = require('../../middlewares/authMiddleware');
const upload = require('../../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Alumni profile management (bio, degrees, certifications, licences, courses, employment, image)
 */

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

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found.' });
        const profileId = profiles[0].id;

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

        const [profiles] = await pool.query('SELECT id FROM profiles WHERE user_id = ?', [userId]);
        const profileId = profiles[0].id;

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

const getProfileCompletion = async (req, res) => {
    try {
        const userId = req.user.userId;

        const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) return res.status(404).json({ error: 'Profile not found.' });
        const profile = profiles[0];
        const profileId = profile.id;

        //Check each section
        const [degrees] = await pool.query('SELECT COUNT(*) as count FROM degrees WHERE profile_id = ?', [profileId]);
        const [certs] = await pool.query('SELECT COUNT(*) as count FROM certifications WHERE profile_id = ?', [profileId]);
        const [licences] = await pool.query('SELECT COUNT(*) as count FROM licences WHERE profile_id = ?', [profileId]);
        const [courses] = await pool.query('SELECT COUNT(*) as count FROM professional_courses WHERE profile_id = ?', [profileId]);
        const [employment] = await pool.query('SELECT COUNT(*) as count FROM employment_history WHERE profile_id = ?', [profileId]);

        const sections = {
            bio: !!profile.bio,
            linkedin_url: !!profile.linkedin_url,
            profile_image: !!profile.profile_image_url,
            degrees: degrees[0].count > 0,
            certifications: certs[0].count > 0,
            licences: licences[0].count > 0,
            professional_courses: courses[0].count > 0,
            employment_history: employment[0].count > 0
        };

        const completed = Object.values(sections).filter(Boolean).length;
        const total = Object.keys(sections).length;
        const percentage = Math.round((completed / total) * 100);

        res.status(200).json({
            completion_percentage: percentage,
            completed_sections: completed,
            total_sections: total,
            sections
        });
    } catch (error) {
        console.error('Profile Completion Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

//Routes

/**
 * @swagger
 * /api/profile/me:
 *   get:
 *     summary: Get the logged-in user's profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's profile data
 *       404:
 *         description: Profile not found
 */
router.get('/me', getMyProfile);

/**
 * @swagger
 * /api/profile/me:
 *   put:
 *     summary: Update bio and LinkedIn URL
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 example: Software Engineer at ABC Company
 *               linkedin_url:
 *                 type: string
 *                 example: https://linkedin.com/in/profile_name
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid LinkedIn URL
 */
router.put('/me', updateBaseProfile);

/**
 * @swagger
 * /api/profile/me/completion:
 *   get:
 *     summary: View profile completion status
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Returns completion percentage and section status
 */
router.get('/me/completion', getProfileCompletion);

/**
 * @swagger
 * /api/profile/me/degrees:
 *   get:
 *     summary: Get all degrees
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of degrees
 */
router.get('/me/degrees', getDegrees);

/**
 * @swagger
 * /api/profile/me/degrees:
 *   post:
 *     summary: Add a new degree
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, official_url, completion_date]
 *             properties:
 *               title:
 *                 type: string
 *                 example: BSc Computer Science
 *               official_url:
 *                 type: string
 *                 example: https://www.westminster.ac.uk/computer-science
 *               completion_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-01"
 *     responses:
 *       201:
 *         description: Degree added successfully
 *       400:
 *         description: Missing fields or invalid URL
 */
router.post('/me/degrees', addDegree);

/**
 * @swagger
 * /api/profile/me/degrees/{id}:
 *   put:
 *     summary: Update a degree
 *     tags: [Profile]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               official_url:
 *                 type: string
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Degree updated
 *       404:
 *         description: Not found or unauthorized
 */
router.put('/me/degrees/:id', updateDegree);

/**
 * @swagger
 * /api/profile/me/degrees/{id}:
 *   delete:
 *     summary: Delete a degree
 *     tags: [Profile]
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
 *         description: Degree deleted
 *       404:
 *         description: Not found or unauthorized
 */
router.delete('/me/degrees/:id', deleteDegree);

/**
 * @swagger
 * /api/profile/me/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of certifications
 */
router.get('/me/certifications', getCertifications);

/**
 * @swagger
 * /api/profile/me/certifications:
 *   post:
 *     summary: Add a new certification
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, url, completion_date]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Red Hat Certified System Administrator
 *               url:
 *                 type: string
 *                 example: https://www.redhat.com/en/services/certification/rhcsa
 *               completion_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-01"
 *     responses:
 *       201:
 *         description: Certification added
 */
router.post('/me/certifications', addCertification);

/**
 * @swagger
 * /api/profile/me/certifications/{id}:
 *   put:
 *     summary: Update a certification
 *     tags: [Profile]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Certification updated
 *       404:
 *         description: Not found
 */
router.put('/me/certifications/:id', updateCertification);

/**
 * @swagger
 * /api/profile/me/certifications/{id}:
 *   delete:
 *     summary: Delete a certification
 *     tags: [Profile]
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
 *         description: Certification deleted
 */
router.delete('/me/certifications/:id', deleteCertification);

/**
 * @swagger
 * /api/profile/me/licences:
 *   get:
 *     summary: Get all licences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of licences
 */
router.get('/me/licences', getLicences);

/**
 * @swagger
 * /api/profile/me/licences:
 *   post:
 *     summary: Add a new licence
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, url, completion_date]
 *             properties:
 *               title:
 *                 type: string
 *                 example: CIMA Professional
 *               url:
 *                 type: string
 *                 example: https://www.cimaglobal.com
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Licence added
 */
router.post('/me/licences', addLicence);

/**
 * @swagger
 * /api/profile/me/licences/{id}:
 *   put:
 *     summary: Update a licence
 *     tags: [Profile]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Licence updated
 */
router.put('/me/licences/:id', updateLicence);

/**
 * @swagger
 * /api/profile/me/licences/{id}:
 *   delete:
 *     summary: Delete a licence
 *     tags: [Profile]
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
 *         description: Licence deleted
 */
router.delete('/me/licences/:id', deleteLicence);

/**
 * @swagger
 * /api/profile/me/professional-courses:
 *   get:
 *     summary: Get all professional courses
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of professional courses
 */
router.get('/me/professional-courses', getCourses);

/**
 * @swagger
 * /api/profile/me/professional-courses:
 *   post:
 *     summary: Add a new professional course
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, url, completion_date]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Udemy react advanced
 *               url:
 *                 type: string
 *                 example: https://udemy.com/react-advanced
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Course added
 */
router.post('/me/professional-courses', addCourse);

/**
 * @swagger
 * /api/profile/me/professional-courses/{id}:
 *   put:
 *     summary: Update a professional course
 *     tags: [Profile]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               completion_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Course updated
 */
router.put('/me/professional-courses/:id', updateCourse);

/**
 * @swagger
 * /api/profile/me/professional-courses/{id}:
 *   delete:
 *     summary: Delete a professional course
 *     tags: [Profile]
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
 *         description: Course deleted
 */
router.delete('/me/professional-courses/:id', deleteCourse);

/**
 * @swagger
 * /api/profile/me/employment:
 *   get:
 *     summary: Get employment history
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of employment records
 */
router.get('/me/employment', getEmployment);

/**
 * @swagger
 * /api/profile/me/employment:
 *   post:
 *     summary: Add employment record
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company, role, start_date]
 *             properties:
 *               company:
 *                 type: string
 *                 example: CDB Finance
 *               role:
 *                 type: string
 *                 example: Software Engineer
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-06-06"
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-01"
 *     responses:
 *       201:
 *         description: Employment added
 */
router.post('/me/employment', addEmployment);

/**
 * @swagger
 * /api/profile/me/employment/{id}:
 *   put:
 *     summary: Update an employment record
 *     tags: [Profile]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               company:
 *                 type: string
 *               role:
 *                 type: string
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Employment updated
 */
router.put('/me/employment/:id', updateEmployment);

/**
 * @swagger
 * /api/profile/me/employment/{id}:
 *   delete:
 *     summary: Delete an employment record
 *     tags: [Profile]
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
 *         description: Employment deleted
 */
router.delete('/me/employment/:id', deleteEmployment);

/**
 * @swagger
 * /api/profile/me/image:
 *   post:
 *     summary: Upload profile image
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *         ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: No image file provided
 */
router.post('/me/image', upload.single('profileImage'), uploadProfileImage);

module.exports = router;
