const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, referral_code } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        let referredBy = null;
        if (referral_code) {
            const referrer = await User.findOne({ referral_code });
            if (referrer) {
                referredBy = referrer._id;
            }
        }
        
        const user = new User({
            username,
            email,
            password,
            referral_code: generateReferralCode(),
            referred_by: referredBy
        });
        
        await user.save();
        
        if (referredBy) {
            await User.updateOne({ _id: referredBy }, { $inc: { balance: 50, referral_earnings: 50 } });
        }
        
        const token = jwt.sign({ userId: user._id, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({ success: true, token, user: { id: user._id, username: user.username, balance: user.balance } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        user.last_login = new Date();
        await user.save();
        
        const token = jwt.sign({ userId: user._id, is_admin: user.is_admin }, process.env.JWT_SECRET);
        res.json({ success: true, token, user: { id: user._id, username: user.username, balance: user.balance, is_admin: user.is_admin } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
