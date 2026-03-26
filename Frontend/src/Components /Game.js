import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Game = ({ socket, token, balance, setBalance }) => {
    const [roundId, setRoundId] = useState(null);
    const [timer, setTimer] = useState(0);
    const [result, setResult] = useState(null);
    const [betAmount, setBetAmount] = useState(10);
    const [selectedColor, setSelectedColor] = useState('Red');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pattern, setPattern] = useState(null);

    useEffect(() => {
        fetchHistory();
        fetchPattern();

        socket.on('new_round', (data) => {
            setRoundId(data.round_id);
            setTimer(data.timer);
            setResult(null);
        });

        socket.on('round_result', (data) => {
            setResult(data);
            fetchHistory();
            fetchPattern();
            toast.success(`${data.result_color} ${data.result_number} came!`);
        });

        const interval = setInterval(() => {
            setTimer(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

        return () => {
            socket.off('new_round');
            socket.off('round_result');
            clearInterval(interval);
        };
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/game/history');
            setHistory(res.data.slice(0, 20));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const fetchPattern = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/game/pattern');
            setPattern(res.data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const placeBet = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/game/bet', {
                bet_amount: betAmount,
                bet_color: selectedColor
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                setBalance(res.data.balance);
                toast.success(`Bet placed: ₹${betAmount} on ${selectedColor}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error placing bet');
        }
        setLoading(false);
    };

    return (
        <div className="game-container">
            <div className="game-header">
                <div className="round-info">
                    <h2>Round: {roundId?.slice(-6)}</h2>
                    <div className="timer">⏱️ {timer}s</div>
                </div>
                
                {result && (
                    <div className={`result-card result-${result.result_color.toLowerCase()}`}>
                        <div className="result-number">{result.result_number}</div>
                        <div className="result-color">{result.result_color}</div>
                        <div className="result-multiplier">x{result.multiplier}</div>
                    </div>
                )}
            </div>

            {pattern && (
                <div className="pattern-analyzer">
                    <h3>📊 Pattern Analyzer</h3>
                    <div className="pattern-stats">
                        <div>🔥 Hot: {pattern.hot_colors?.join(', ') || 'None'}</div>
                        <div>❄️ Cold: {pattern.cold_colors?.join(', ') || 'None'}</div>
                        <div>📈 Next prediction: <strong>{pattern.prediction}</strong></div>
                    </div>
                </div>
            )}

            <div className="bet-section">
                <h3>Place Your Bet</h3>
                <div className="bet-amounts">
                    {[10, 50, 100, 500, 1000].map(amt => (
                        <button key={amt} className={`amount-btn ${betAmount === amt ? 'active' : ''}`} onClick={() => setBetAmount(amt)}>
                            ₹{amt}
                        </button>
                    ))}
                </div>
                <div className="color-buttons">
                    <button className="color-btn red" onClick={() => setSelectedColor('Red')}>
                        🔴 RED
                    </button>
                    <button className="color-btn green" onClick={() => setSelectedColor('Green')}>
                        🟢 GREEN
                    </button>
                    <button className="color-btn blue" onClick={() => setSelectedColor('Blue')}>
                        🔵 BLUE
                    </button>
                </div>
                <div className="bet-info">
                    <p>Bet: ₹{betAmount} on <strong>{selectedColor}</strong></p>
                    <button className="place-bet-btn" onClick={placeBet} disabled={loading || timer === 0}>
                        {loading ? 'Placing...' : 'Place Bet'}
                    </button>
                </div>
            </div>

            <div className="history-section">
                <h3>Recent Results</h3>
                <div className="history-list">
                    {history.map((h, i) => (
                        <div key={i} className={`history-item ${h.result_color.toLowerCase()}`}>
                            {h.result_number}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Game;
