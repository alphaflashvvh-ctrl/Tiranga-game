const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Bet = require('../models/Bet');
const Game = require('../models/Game');
const router = express.Router();

let currentRound = null;

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

// Place bet
router.post('/bet', authMiddleware, async (req, res) => {
    try {
        const { bet_amount, bet_color } = req.body;
        const user = await User.findById(req.userId);
        
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.balance < bet_amount) return res.status(400).json({ error: 'Insufficient balance' });
        
        const app = req.app;
        currentRound = app.get('currentRound')();
        if (!currentRound || currentRound.status !== 'active') return res.status(400).json({ error: 'No active round' });
        
        if (bet_amount < 10) return res.status(400).json({ error: 'Minimum bet is ₹10' });
        if (bet_amount > 10000) return res.status(400).json({ error: 'Maximum bet is ₹10,000' });
        
        await User.updateOne({ _id: user._id }, { $inc: { balance: -bet_amount, total_bet: bet_amount } });
        
        const bet = new Bet({
            user_id: user._id,
            round_id: currentRound.round_id,
            bet_amount,
            bet_color
        });
        await bet.save();
        
        res.json({ success: true, balance: user.balance - bet_amount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get history
router.get('/history', async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const history = await Game.find().sort({ created_at: -1 }).limit(parseInt(limit));
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Pattern analysis
router.get('/pattern', async (req, res) => {
    try {
        const games = await Game.find().sort({ created_at: -1 }).limit(50);
        const results = games.map(g => g.result_color);
        
        const counts = { Red: 0, Green: 0, Blue: 0 };
        results.forEach(r => counts[r]++);
        
        let hot = [], cold = [];
        const avg = results.length / 3;
        for (let [color, count] of Object.entries(counts)) {
            if (count > avg * 1.2) hot.push(color);
            if (count < avg * 0.8) cold.push(color);
        }
        
        let prediction = 'Red';
        if (results.length > 0) {
            const last = results[0];
            if (last === 'Red') prediction = 'Blue';
            else if (last === 'Blue') prediction = 'Red';
            else prediction = 'Red';
        }
        
        res.json({ hot_colors: hot, cold_colors: cold, prediction, counts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user bets
router.get('/my-bets', authMiddleware, async (req, res) => {
    try {
        const bets = await Bet.find({ user_id: req.userId }).sort({ created_at: -1 }).limit(50);
        res.json(bets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const leaders = await User.find({ is_active: true })
            .sort({ total_win: -1 })
            .limit(10)
            .select('username total_win total_win_count balance');
        res.json(leaders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
