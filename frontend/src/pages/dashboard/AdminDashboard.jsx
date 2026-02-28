import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, BarChart3, UserCircle, Shield, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function AdminDashboard() {
    const { user, userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [allUsers, setAllUsers] = useState([]);
    const [allAnalyses, setAllAnalyses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    const tabs = [
        { id: 'users', label: 'Users', icon: <Users size={18} /> },
        { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
        { id: 'profile', label: 'My Profile', icon: <UserCircle size={18} /> },
    ];

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            // Fetch all profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            // Fetch all analysis history
            const { data: analyses } = await supabase
                .from('food_analysis_history')
                .select('*')
                .order('created_at', { ascending: false });

            setAllUsers(profiles || []);
            setAllAnalyses(analyses || []);
        } catch (err) {
            console.error('Error fetching admin data:', err);
        }
        setLoading(false);
    };

    // Compute analytics
    const getUserAnalysisCount = (userId) => {
        return allAnalyses.filter(a => a.user_id === userId).length;
    };

    const getUserCalories = (userId) => {
        return allAnalyses
            .filter(a => a.user_id === userId)
            .reduce((sum, a) => sum + (a.total_calories || 0), 0);
    };

    const userChartData = allUsers.map(u => ({
        name: u.email?.split('@')[0] || 'User',
        analyses: getUserAnalysisCount(u.id),
        calories: Math.round(getUserCalories(u.id))
    })).filter(u => u.analyses > 0);

    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard__main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard__sidebar">
                <div className="dashboard__sidebar-header">
                    <div className="dashboard__avatar" style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)' }}>
                        <Shield size={20} />
                    </div>
                    <div>
                        <p className="dashboard__user-name">Admin Panel</p>
                        <p className="dashboard__user-email">{user?.email}</p>
                    </div>
                </div>

                <nav className="dashboard__nav">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`dashboard__nav-item ${activeTab === tab.id ? 'dashboard__nav-item--active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="dashboard__main">
                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>All Users</h2>
                        <p className="dashboard__tab-desc">Manage and view all registered users.</p>

                        <div className="admin-stats">
                            <div className="analysis-stat glass-card">
                                <h4>Total Users</h4>
                                <span>{allUsers.length}</span>
                            </div>
                            <div className="analysis-stat glass-card">
                                <h4>Total Analyses</h4>
                                <span>{allAnalyses.length}</span>
                            </div>
                            <div className="analysis-stat glass-card">
                                <h4>Total Calories Tracked</h4>
                                <span>{allAnalyses.reduce((s, a) => s + (a.total_calories || 0), 0).toFixed(0)}</span>
                            </div>
                        </div>

                        <div className="admin-users-table" style={{ marginTop: '24px' }}>
                            <table className="upload-results__table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Analyses</th>
                                        <th>Total Calories</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map((u, i) => (
                                        <tr key={u.id || i} style={{ cursor: 'pointer' }} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}>
                                            <td>{u.email || 'N/A'}</td>
                                            <td>
                                                <span className="profile-role-badge">{u.role || 'user'}</span>
                                            </td>
                                            <td>{getUserAnalysisCount(u.id)}</td>
                                            <td>{getUserCalories(u.id).toFixed(1)} kcal</td>
                                            <td>{new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedUser && (
                            <div className="admin-user-detail glass-card animate-scale-in" style={{ marginTop: '20px', padding: '24px' }}>
                                <h3>User Details: {selectedUser.email}</h3>
                                <div className="profile-info" style={{ marginTop: '16px' }}>
                                    <div className="profile-info__row">
                                        <span>User ID</span><span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{selectedUser.id}</span>
                                    </div>
                                    <div className="profile-info__row">
                                        <span>Role</span><span className="profile-role-badge">{selectedUser.role || 'user'}</span>
                                    </div>
                                    <div className="profile-info__row">
                                        <span>Total Analyses</span><span>{getUserAnalysisCount(selectedUser.id)}</span>
                                    </div>
                                    <div className="profile-info__row">
                                        <span>Total Calories</span><span>{getUserCalories(selectedUser.id).toFixed(1)} kcal</span>
                                    </div>
                                </div>

                                {/* User's recent analyses */}
                                {allAnalyses.filter(a => a.user_id === selectedUser.id).length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <h4 style={{ marginBottom: '8px' }}>Recent Analyses</h4>
                                        {allAnalyses.filter(a => a.user_id === selectedUser.id).slice(0, 5).map((a, i) => (
                                            <div key={i} className="history-item" style={{ padding: '12px', marginBottom: '8px', background: 'var(--bg-dark-elevated)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{a.filename || 'Unknown file'}</span>
                                                    <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>{(a.total_calories || 0).toFixed(1)} kcal</span>
                                                </div>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    {new Date(a.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Platform Analytics</h2>
                        <p className="dashboard__tab-desc">Overview of all user activity across the platform.</p>

                        {userChartData.length > 0 ? (
                            <div className="analysis-charts">
                                <div className="analysis-chart glass-card">
                                    <h3>Analyses per User</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={userChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--bg-dark-card)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <Bar dataKey="analyses" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} name="Analyses" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="analysis-chart glass-card">
                                    <h3>Calories Tracked per User</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={userChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--bg-dark-card)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                            <Bar dataKey="calories" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Total Calories" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="dashboard__empty glass-card">
                                <BarChart3 size={48} color="var(--text-muted)" />
                                <p>No analysis data yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Admin Profile</h2>
                        <p className="dashboard__tab-desc">Your admin account details.</p>

                        <div className="profile-section glass-card">
                            <h3>Account Information</h3>
                            <div className="profile-info">
                                <div className="profile-info__row">
                                    <span>Email</span><span>{user?.email}</span>
                                </div>
                                <div className="profile-info__row">
                                    <span>Role</span><span className="profile-role-badge" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA' }}>admin</span>
                                </div>
                                <div className="profile-info__row">
                                    <span>Member Since</span>
                                    <span>{new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
