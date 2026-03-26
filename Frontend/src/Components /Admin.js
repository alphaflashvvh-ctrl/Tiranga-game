import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Admin = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [games, setGames] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState(0);

    useEffect(() => {
        fetchStats();
        fetchUsers();
        fetchGames();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            toast.error('Error fetching stats');
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            toast.error('Error fetching users');
        }
    };

    const fetchGames = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/admin/games', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setGames(res.data);
        } catch (error) {
            toast.error('Error fetching games');
        }
    };

    const updateBalance = async (action) => {
        try {
            await axios.post('http://localhost:5000/api/admin/update-balance', {
                user_id: selectedUser,
                amount,
                action
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success(`Balance ${action === 'add' ? 'added' : 'deducted'}`);
            fetchUsers();
            setAmount(0);
        } catch (error) {
            toast.error('Error updating balance');
        }
    };

    return (
        <div className="admin-container">
            <h1>Admin Dashboard</h1>
            
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">👥 Total Users: {stats.total_users}</div>
                    <div className="stat-card">🎲 Total Bets: {stats.total_bets}</div>
                    <div className="stat-card">💰 Deposits: ₹{stats.total_deposits?.toFixed(2)}</div>
                    <div className="stat-card">💸 Withdrawals: ₹{stats.total_withdrawals?.toFixed(2)}</div>
                    <div className="stat-card">📈 Profit: ₹{stats.profit?.toFixed(2)}</div>
                </div>
            )}

            <div className="admin-section">
                <h2>Users</h2>
                <table className="admin-table">
                    <thead>
                        <tr><th>Username</th><th>Balance</th><th>Total Win</th><th>Total Loss</th><th>Referrals</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id}>
                                <td>{user.username}</td>
                                <td>₹{user.balance?.toFixed(2)}</td>
                                <td>₹{user.total_win?.toFixed(2)}</td>
                                <td>₹{user.total_loss?.toFixed(2)}</td>
                                <td>{user.referral_earnings?.toFixed(2)}</td>
                                <td>
                                    <button onClick={() => setSelectedUser(user._id)}>Adjust</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedUser && (
                <div className="adjust-modal">
                    <h3>Adjust Balance</h3>
                    <input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} />
                    <button onClick={() => updateBalance('add')}>Add</button>
                    <button onClick={() => updateBalance('deduct')}>Deduct</button>
                    <button onClick={() => setSelectedUser(null)}>Close</button>
                </div>
            )}

            <div className="admin-section">
                <h2>Recent Games</h2>
                <table className="admin-table">
                    <thead>
                        <tr><th>Round ID</th><th>Result</th><th>Multiplier</th><th>Total Bets</th><th>Total Won</th><th>Time</th></tr>
                    </thead>
                    <tbody>
                        {games.map(game => (
                            <tr key={game._id}>
                                <td>{game.round_id?.slice(-8)}</td>
                                <td className={`result-${game.result_color?.toLowerCase()}`}>{game.result_number} {game.result_color}</td>
                                <td>x{game.multiplier}</td>
                                <td>{game.total_bets}</td>
                                <td>₹{game.total_won?.toFixed(2)}</td>
                                <td>{new Date(game.created_at).toLocaleTimeString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Admin;
