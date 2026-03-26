const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    balance: { type: Number, default: 0 },
    total_bet: { type: Number, default: 0 },
    total_win: { type: Number, default: 0 },
    total_loss: { type: Number, default: 0 },
    total_win_count: { type: Number, default: 0 },
    total_loss_count: { type: Number, default: 0 },
    referral_code: { type: String, unique: true },
    referred_by: { type: String, default: null },
    referral_earnings: { type: Number, default: 0 },
    is_admin: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    last_login: Date
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
