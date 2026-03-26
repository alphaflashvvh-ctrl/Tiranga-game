const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

const CRYPTO_ADDRESS = '0xYourCryptoWalletAddressHere';

// Request deposit
router.post('/deposit', authMiddleware, async (req, res) => {
    try {
        const { amount, method } = req.body;
        
        if (amount < 100) return res.status(400).json({ error: 'Minimum deposit ₹100' });
        
        const transaction = new Transaction({
            user_id: req.userId,
            type: 'deposit',
            amount,
            payment_method: method,
            status: 'pending'
        });
        await transaction.save();
        
        if (method === 'crypto') {
            res.json({
                success: true,
                transaction_id: transaction._id,
                address: CRYPTO_ADDRESS,
                amount_usdt: (amount / 85).toFixed(2),
                qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${CRYPTO_ADDRESS}`
            });
        } else {
            res.json({
                success: true,
                transaction_id: transaction._id,
                upi_id: 'your_upi@okhdfcbank',
                qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=your_upi@okhdfcbank`
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Request withdrawal
router.post('/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, address } = req.body;
        const user = await User.findById(req.userId);
        
        if (user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
        if (amount < 500) return res.status(400).json({ error: 'Minimum withdrawal ₹500' });
        
        await User.updateOne({ _id: req.userId }, { $inc: { balance: -amount } });
        
        const transaction = new Transaction({
            user_id: req.userId,
            type: 'withdraw',
            amount,
            payment_method: 'crypto',
            status: 'pending',
            tx_hash: address
        });
        await transaction.save();
        
        res.json({ success: true, transaction_id: transaction._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check transaction status
router.get('/status/:txid', authMiddleware, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.txid);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
        if (transaction.user_id.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
        
        res.json({ status: transaction.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user transactions
router.get('/my-transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user_id: req.userId }).sort({ created_at: -1 }).limit(50);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
