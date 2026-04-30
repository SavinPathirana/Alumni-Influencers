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

//Verify email page
router.get('/verify-email', (req, res) => {
    res.render('verify-email', {
        title: 'Verify Email — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
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

//Sponsorships page
router.get('/sponsorships', (req, res) => {
    res.render('sponsorships', {
        title: 'Sponsorships — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Wallet page
router.get('/wallet', (req, res) => {
    res.render('wallet', {
        title: 'Wallet — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//API Keys management page (admin only)
router.get('/api-keys', (req, res) => {
    res.render('api-keys', {
        title: 'API Keys — Alumni Influencers',
        apiKey: process.env.AR_CLIENT_API_KEY || ''
    });
});

//Create Sponsor page (admin only)
router.get('/create-sponsor', (req, res) => {
    res.render('create-sponsor', {
        title: 'Create Sponsor — Alumni Influencers'
    });
});

//Root redirect to login
router.get('/', (req, res) => {
    res.redirect('/login');
});

module.exports = router;

