const express = require('express');
const router = express.Router();

//Login page
router.get('/login', (req, res) => {
    res.render('login', { title: 'Login — Alumni Influencers' });
});

//Register page
router.get('/register', (req, res) => {
    res.render('register', { title: 'Register — Alumni Influencers' });
});

//Dashboard page (charts)
router.get('/dashboard', (req, res) => {
    res.render('dashboard', { title: 'Dashboard — Alumni Influencers' });
});

//Alumni browse page
router.get('/alumni', (req, res) => {
    res.render('alumni', { title: 'Browse Alumni — Alumni Influencers' });
});

//Root redirect to login
router.get('/', (req, res) => {
    res.redirect('/login');
});

module.exports = router;
