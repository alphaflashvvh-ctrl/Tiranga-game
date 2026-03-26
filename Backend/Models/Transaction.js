const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'bet', 'win', 'referral'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    tx_hash: { type: String },
    payment_method: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
