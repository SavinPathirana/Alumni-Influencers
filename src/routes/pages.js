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

//Forgot password page
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { title: 'Forgot Password — Alumni Influencers' });
});

//Reset password page
router.get('/reset-password', (req, res) => {
    res.render('reset-password', { title: 'Reset Password — Alumni Influencers' });
});

//Dashboard page
router.get('/dashboard', (req, res) => {
    res.render('dashboard', {
        title: 'Dashboard — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Alumni browse page
router.get('/alumni', (req, res) => {
    res.render('alumni', {
        title: 'Browse Alumni — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Profile management page
router.get('/profile', (req, res) => {
    res.render('profile', {
        title: 'My Profile — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Bidding page
router.get('/bidding', (req, res) => {
    res.render('bidding', {
        title: 'Bidding — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Root redirect to login
router.get('/', (req, res) => {
    res.redirect('/login');
});

module.exports = router;
