const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Models
const User = require('./models/User');
const Game = require('./models/Game');
const Bet = require('./models/Bet');
const Transaction = require('./models/Transaction');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment', require('./routes/payment'));

// Game State
let currentRound = null;
let roundTimer = null;
let gameHistory = [];

// Generate random result
function generateResult() {
    const num = Math.floor(Math.random() * 10);
    let color = '';
    if ([0,3,6,9].includes(num)) color = 'Red';
    else if ([1,4,7].includes(num)) color = 'Green';
    else color = 'Blue';
    return { number: num, color, multiplier: 2 };
}

// Start new round
async function startNewRound() {
    const roundId = Date.now().toString();
    const result = generateResult();
    
    currentRound = {
        round_id: roundId,
        result: result,
        start_time: new Date(),
        end_time: new Date(Date.now() + 30000),
        status: 'active',
        total_bets: 0,
        bets: []
    };
    
    const game = new Game({
        round_id: roundId,
        result_number: result.number,
        result_color: result.color,
        multiplier: result.multiplier
    });
    await game.save();
    
    io.emit('new_round', {
        round_id: roundId,
        timer: 30,
        end_time: currentRound.end_time
    });
    
    roundTimer = setTimeout(async () => {
        await endRound(roundId, result);
    }, 30000);
}

// End round and process bets
async function endRound(roundId, result) {
    if (currentRound.status !== 'active') return;
    
    currentRound.status = 'ended';
    
    const bets = await Bet.find({ round_id: roundId, status: 'pending' });
    const winners = [];
    
    for (let bet of bets) {
        if (bet.bet_color === result.color) {
            const winAmount = bet.bet_amount * result.multiplier;
            await Bet.updateOne({ _id: bet._id }, {
                status: 'win',
                win_amount: winAmount,
                multiplier: result.multiplier
            });
            await User.updateOne({ _id: bet.user_id }, {
                $inc: { 
                    balance: winAmount,
                    total_win: winAmount,
                    total_win_count: 1
                }
            });
            winners.push({ user_id: bet.user_id, amount: winAmount });
        } else {
            await Bet.updateOne({ _id: bet._id }, { status: 'loss' });
            await User.updateOne({ _id: bet.user_id }, {
                $inc: { total_loss: bet.bet_amount, total_loss_count: 1 }
            });
        }
    }
    
    // Update game with stats
    await Game.updateOne({ round_id: roundId }, {
        total_bets: bets.length,
        total_won: winners.reduce((sum, w) => sum + w.amount, 0),
        winners_count: winners.length
    });
    
    // Add to history
    gameHistory.unshift({
        round_id: roundId,
        result: result,
        total_bets: bets.length,
        timestamp: new Date()
    });
    if (gameHistory.length > 100) gameHistory.pop();
    
    io.emit('round_result', {
        round_id: roundId,
        result_number: result.number,
        result_color: result.color,
        result_symbol: result.number,
        multiplier: result.multiplier,
        winners_count: winners.length
    });
    
    // Start next round after 5 seconds
    setTimeout(() => startNewRound(), 5000);
}

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    socket.on('join_game', (data) => {
        socket.join('game_room');
        if (currentRound) {
            socket.emit('current_round', {
                round_id: currentRound.round_id,
                timer: Math.max(0, Math.floor((currentRound.end_time - Date.now()) / 1000)),
                status: currentRound.status
            });
        }
        socket.emit('game_history', gameHistory.slice(0, 20));
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make currentRound available to routes
app.set('currentRound', () => currentRound);
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startNewRound();
});
