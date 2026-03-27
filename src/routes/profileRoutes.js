const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middlewares/authMiddleware');

router.use(authenticateToken);
router.get('/me', profileController.getMyProfile);
router.put('/me', profileController.updateBaseProfile);

module.exports = router;