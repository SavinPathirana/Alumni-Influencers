const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.use(authenticateToken);
router.get('/me', profileController.getMyProfile);
router.put('/me', profileController.updateBaseProfile);
router.get('/me/degrees', profileController.getDegrees);
router.post('/me/degrees', profileController.addDegree);
router.put('/me/degrees/:id', profileController.updateDegree);
router.delete('/me/degrees/:id', profileController.deleteDegree);
router.get('/me/certifications', profileController.getCertifications);
router.post('/me/certifications', profileController.addCertification);
router.put('/me/certifications/:id', profileController.updateCertification);
router.delete('/me/certifications/:id', profileController.deleteCertification);
router.get('/me/licences', profileController.getLicences);
router.post('/me/licences', profileController.addLicence);
router.put('/me/licences/:id', profileController.updateLicence);
router.delete('/me/licences/:id', profileController.deleteLicence);
router.get('/me/professional-courses', profileController.getCourses);
router.post('/me/professional-courses', profileController.addCourse);
router.put('/me/professional-courses/:id', profileController.updateCourse);
router.delete('/me/professional-courses/:id', profileController.deleteCourse);
router.get('/me/employment', profileController.getEmployment);
router.post('/me/employment', profileController.addEmployment);
router.put('/me/employment/:id', profileController.updateEmployment);
router.delete('/me/employment/:id', profileController.deleteEmployment);
router.post('/me/image', upload.single('profileImage'), profileController.uploadProfileImage);


module.exports = router;