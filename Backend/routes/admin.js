const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const router = express.Router();

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const adminMiddleware = async (req, res, next) => {
    const user = await User.findById(req.userId);
    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Dashboard stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBets = await Bet.countDocuments();
        const totalDeposits = await Transaction.aggregate([
            { $match: { type: 'deposit', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawals = await Transaction.aggregate([
            { $match: { type: 'withdraw', status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.json({
            total_users: totalUsers,
            total_bets: totalBets,
            total_deposits: totalDeposits[0]?.total || 0,
            total_withdrawals: totalWithdrawals[0]?.total || 0,
            profit: (totalDeposits[0]?.total || 0) - (totalWithdrawals[0]?.total || 0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ created_at: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user balance
router.post('/update-balance', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { user_id, amount, action } = req.body;
        const update = action === 'add' ? { $inc: { balance: amount } } : { $inc: { balance: -amount } };
        await User.updateOne({ _id: user_id }, update);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all games
router.get('/games', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const games = await Game.find().sort({ created_at: -1 }).limit(100);
        res.json(games);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
