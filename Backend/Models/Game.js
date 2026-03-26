const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
    round_id: { type: String, required: true, unique: true },
    result_number: { type: Number, required: true },
    result_color: { type: String, required: true },
    multiplier: { type: Number, default: 2 },
    total_bets: { type: Number, default: 0 },
    total_won: { type: Number, default: 0 },
    winners_count: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', GameSchema);
