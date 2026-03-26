import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import io from 'socket.io-client';
import Game from './components/Game';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import History from './components/History';
import Leaderboard from './components/Leaderboard';
import Referral from './components/Referral';
import Admin from './components/Admin';
import './styles/App.css';

const socket = io('http://localhost:5000');

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        if (token) {
            fetchUserData();
        }
    }, [token]);

    const fetchUserData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                setBalance(data.user.balance);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        toast.success('Logged out');
    };

    return (
        <BrowserRouter>
            <Toaster position="top-right" />
            <div className="app">
                <nav className="navbar">
                    <div className="nav-brand">🎯 Tiranga Game</div>
                    {user && (
                        <div className="nav-links">
                            <span>💰 ₹{balance.toFixed(2)}</span>
                            <a href="/game">Game</a>
                            <a href="/history">History</a>
                            <a href="/leaderboard">Leaderboard</a>
                            <a href="/referral">Referral</a>
                            <a href="/profile">Profile</a>
                            {user.is_admin && <a href="/admin">Admin</a>}
                            <button onClick={logout}>Logout</button>
                        </div>
                    )}
                </nav>
                
                <Routes>
                    <Route path="/login" element={!user ? <Login setToken={setToken} setUser={setUser} /> : <Navigate to="/game" />} />
                    <Route path="/register" element={!user ? <Register /> : <Navigate to="/game" />} />
                    <Route path="/game" element={user ? <Game socket={socket} token={token} balance={balance} setBalance={setBalance} /> : <Navigate to="/login" />} />
                    <Route path="/history" element={user ? <History token={token} /> : <Navigate to="/login" />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/referral" element={user ? <Referral token={token} user={user} /> : <Navigate to="/login" />} />
                    <Route path="/profile" element={user ? <Profile token={token} user={user} /> : <Navigate to="/login" />} />
                    <Route path="/admin" element={user?.is_admin ? <Admin token={token} /> : <Navigate to="/game" />} />
                    <Route path="/" element={<Navigate to={user ? "/game" : "/login"} />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
