const mongoose = require('mongoose');

const BetSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    round_id: { type: String, required: true },
    bet_amount: { type: Number, required: true },
    bet_color: { type: String, required: true },
    status: { type: String, enum: ['pending', 'win', 'loss'], default: 'pending' },
    win_amount: { type: Number, default: 0 },
    multiplier: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bet', BetSchema);
