const express = require('express');
const router = express.Router();
const { Profile, Degree, Certification, Licence, ProfessionalCourse, Employment } = require('../../models');
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

        const profile = await Profile.findOne({
            where: { user_id: userId },
            attributes: ['first_name', 'last_name', 'bio', 'linkedin_url', 'profile_image_url', 'programme', 'graduation_date', 'industry_sector', 'location', 'monthly_appearance_count', 'has_event_bonus']
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        res.status(200).json({ profile });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const updateBaseProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { bio, linkedin_url, first_name, last_name, programme, graduation_date, industry_sector, location } = req.body;

        //Validation
        if (linkedin_url && !isValidUrl(linkedin_url)) {
            return res.status(400).json({ error: 'Invalid LinkedIn URL format.' });
        }
        if (linkedin_url && !linkedin_url.includes('linkedin.com')) {
            return res.status(400).json({ error: 'URL must be a valid LinkedIn profile.' });
        }

        const updateData = {};
        if (bio !== undefined) updateData.bio = bio;
        if (linkedin_url !== undefined) updateData.linkedin_url = linkedin_url;
        if (first_name !== undefined) updateData.first_name = first_name;
        if (last_name !== undefined) updateData.last_name = last_name;
        if (programme !== undefined) updateData.programme = programme;
        if (graduation_date !== undefined) updateData.graduation_date = graduation_date;
        if (industry_sector !== undefined) updateData.industry_sector = industry_sector;
        if (location !== undefined) updateData.location = location;

        await Profile.update(
            updateData,
            { where: { user_id: userId } }
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
        const profile = await Profile.findOne({ where: { user_id: userId } });

        const degrees = await Degree.findAll({ where: { profile_id: profile.id } });
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

        const profile = await Profile.findOne({ where: { user_id: userId } });
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        const degree = await Degree.create({
            profile_id: profile.id, title, official_url, completion_date
        });

        res.status(201).json({ message: 'Degree added successfully.', degreeId: degree.id });
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

        const profile = await Profile.findOne({ where: { user_id: userId } });

        const updateData = {};
        if (title) updateData.title = title;
        if (official_url) updateData.official_url = official_url;
        if (completion_date) updateData.completion_date = completion_date;

        const [updatedCount] = await Degree.update(updateData, {
            where: { id: degreeId, profile_id: profile.id }
        });

        if (updatedCount === 0) {
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

        const profile = await Profile.findOne({ where: { user_id: userId } });

        const deletedCount = await Degree.destroy({
            where: { id: degreeId, profile_id: profile.id }
        });

        if (deletedCount === 0) {
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
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const certifications = await Certification.findAll({ where: { profile_id: profile.id } });
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

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const cert = await Certification.create({ profile_id: profile.id, title, url, completion_date });
        res.status(201).json({ message: 'Certification added.', id: cert.id });
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

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const updateData = {};
        if (title) updateData.title = title;
        if (url) updateData.url = url;
        if (completion_date) updateData.completion_date = completion_date;

        const [updatedCount] = await Certification.update(updateData, {
            where: { id: certId, profile_id: profile.id }
        });

        if (updatedCount === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Certification updated.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const deleteCertification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const deletedCount = await Certification.destroy({ where: { id: req.params.id, profile_id: profile.id } });
        if (deletedCount === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Certification deleted.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const getLicences = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const licences = await Licence.findAll({ where: { profile_id: profile.id } });
        res.status(200).json({ licences });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (!title || !url || !completion_date) return res.status(400).json({ error: 'Missing fields.' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const licence = await Licence.create({ profile_id: profile.id, title, url, completion_date });
        res.status(201).json({ message: 'Licence added.', id: licence.id });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (url && !isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const updateData = {};
        if (title) updateData.title = title;
        if (url) updateData.url = url;
        if (completion_date) updateData.completion_date = completion_date;

        const [updatedCount] = await Licence.update(updateData, {
            where: { id: req.params.id, profile_id: profile.id }
        });
        if (updatedCount === 0) return res.status(404).json({ error: 'Not found or unauthorized.' });
        res.status(200).json({ message: 'Licence updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const deletedCount = await Licence.destroy({ where: { id: req.params.id, profile_id: profile.id } });
        if (deletedCount === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Licence deleted.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const getCourses = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const courses = await ProfessionalCourse.findAll({ where: { profile_id: profile.id } });
        res.status(200).json({ courses });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (!title || !url || !completion_date) return res.status(400).json({ error: 'Missing fields.' });
        if (!isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const course = await ProfessionalCourse.create({ profile_id: profile.id, title, url, completion_date });
        res.status(201).json({ message: 'Course added.', id: course.id });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { title, url, completion_date } = req.body;
        if (url && !isValidUrl(url)) return res.status(400).json({ error: 'Invalid URL.' });

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const updateData = {};
        if (title) updateData.title = title;
        if (url) updateData.url = url;
        if (completion_date) updateData.completion_date = completion_date;

        const [updatedCount] = await ProfessionalCourse.update(updateData, {
            where: { id: req.params.id, profile_id: profile.id }
        });
        if (updatedCount === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Course updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const deletedCount = await ProfessionalCourse.destroy({ where: { id: req.params.id, profile_id: profile.id } });
        if (deletedCount === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Course deleted.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const getEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const employment = await Employment.findAll({ where: { profile_id: profile.id } });
        res.status(200).json({ employment });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const addEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { company, role, start_date, end_date } = req.body;
        if (!company || !role || !start_date) return res.status(400).json({ error: 'Company, role, and start_date required.' });

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const emp = await Employment.create({
            profile_id: profile.id, company, role, start_date, end_date: end_date || null
        });
        res.status(201).json({ message: 'Employment added.', id: emp.id });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const updateEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { company, role, start_date, end_date } = req.body;

        const profile = await Profile.findOne({ where: { user_id: userId } });
        const updateData = {};
        if (company) updateData.company = company;
        if (role) updateData.role = role;
        if (start_date) updateData.start_date = start_date;
        if (end_date !== undefined) updateData.end_date = end_date;

        const [updatedCount] = await Employment.update(updateData, {
            where: { id: req.params.id, profile_id: profile.id }
        });
        if (updatedCount === 0) return res.status(404).json({ error: 'Not found.' });
        res.status(200).json({ message: 'Employment updated.' });
    } catch (error) { res.status(500).json({ error: 'Internal server error.' }); }
};

const deleteEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.findOne({ where: { user_id: userId } });
        const deletedCount = await Employment.destroy({ where: { id: req.params.id, profile_id: profile.id } });
        if (deletedCount === 0) return res.status(404).json({ error: 'Not found.' });
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

        await Profile.update(
            { profile_image_url: imageUrl },
            { where: { user_id: userId } }
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

        const profile = await Profile.findOne({ where: { user_id: userId } });
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        //Check each section
        const degreeCount = await Degree.count({ where: { profile_id: profile.id } });
        const certCount = await Certification.count({ where: { profile_id: profile.id } });
        const licenceCount = await Licence.count({ where: { profile_id: profile.id } });
        const courseCount = await ProfessionalCourse.count({ where: { profile_id: profile.id } });
        const employmentCount = await Employment.count({ where: { profile_id: profile.id } });

        const sections = {
            bio: !!profile.bio,
            linkedin_url: !!profile.linkedin_url,
            profile_image: !!profile.profile_image_url,
            degrees: degreeCount > 0,
            certifications: certCount > 0,
            licences: licenceCount > 0,
            professional_courses: courseCount > 0,
            employment_history: employmentCount > 0
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
