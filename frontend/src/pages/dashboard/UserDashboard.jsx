import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload, History, BarChart3, UserCircle, Loader2, Image, Trash2, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Dashboard.css';

const API_URL = 'http://localhost:8000';

export default function UserDashboard() {
    const { user, userProfile, updatePassword, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState('upload');

    // Upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // History state
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Analysis state
    const [analysisData, setAnalysisData] = useState([]);

    // Profile state
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [profileMsg, setProfileMsg] = useState('');
    const [profileError, setProfileError] = useState('');

    const tabs = [
        { id: 'upload', label: 'Upload', icon: <Upload size={18} /> },
        { id: 'history', label: 'History', icon: <History size={18} /> },
        { id: 'analysis', label: 'Analysis', icon: <BarChart3 size={18} /> },
        { id: 'profile', label: 'Profile', icon: <UserCircle size={18} /> },
    ];

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('food_analysis_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setHistoryData(data);
                // Build analysis data from history
                const foodCounts = {};
                data.forEach(entry => {
                    if (entry.results && Array.isArray(entry.results)) {
                        entry.results.forEach(r => {
                            const label = r.Label || r.label || 'Unknown';
                            const cal = parseFloat(r['Energy (kcal)'] || r.calories || 0);
                            if (!foodCounts[label]) {
                                foodCounts[label] = { name: label, totalCalories: 0, count: 0 };
                            }
                            foodCounts[label].totalCalories += cal;
                            foodCounts[label].count += 1;
                        });
                    }
                });
                setAnalysisData(Object.values(foodCounts));
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
        setHistoryLoading(false);
    }, [user]);

    useEffect(() => {
        if (activeTab === 'history' || activeTab === 'analysis') {
            fetchHistory();
        }
    }, [activeTab, fetchHistory]);

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
            setAnalysisResult(null);
            setUploadError('');
        }
    };

    // Handle upload & analyze
    const handleUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setUploadError('');
        setAnalysisResult(null);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await fetch(`${API_URL}/analyze`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            setAnalysisResult(data);

            // Save to Supabase history
            if (user) {
                await supabase.from('food_analysis_history').insert([{
                    user_id: user.id,
                    filename: selectedFile.name,
                    results: data.results || [],
                    total_calories: data.total_calories || 0,
                    thumb_detected: data.thumb_detected || false,
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (err) {
            setUploadError(`Failed to analyze image. Make sure the backend server is running at ${API_URL}. Error: ${err.message}`);
        }
        setUploading(false);
    };

    // Handle password update
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setProfileMsg('');
        setProfileError('');

        if (newPassword !== confirmNewPassword) {
            setProfileError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setProfileError('Password must be at least 6 characters.');
            return;
        }

        const { error } = await updatePassword(newPassword);
        if (error) {
            setProfileError(error.message);
        } else {
            setProfileMsg('Password updated successfully!');
            setNewPassword('');
            setConfirmNewPassword('');
        }
    };

    // Delete history item
    const deleteHistoryItem = async (id) => {
        await supabase.from('food_analysis_history').delete().eq('id', id);
        setHistoryData(prev => prev.filter(item => item.id !== id));
    };

    const COLORS = ['#FF6B35', '#1B998B', '#F7C948', '#A78BFA', '#EF4444', '#22C55E', '#3B82F6', '#EC4899'];

    return (
        <div className="dashboard">
            <div className="dashboard__sidebar">
                <div className="dashboard__sidebar-header">
                    <div className="dashboard__avatar">
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="dashboard__user-name">{user?.user_metadata?.full_name || 'User'}</p>
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
                {/* Upload Tab */}
                {activeTab === 'upload' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Upload Food Image</h2>
                        <p className="dashboard__tab-desc">Upload a photo of your food to get calorie estimates using our YOLOv5 model.</p>

                        <div className="upload-area glass-card">
                            {!preview ? (
                                <label className="upload-area__drop" htmlFor="file-upload">
                                    <Image size={48} color="var(--text-muted)" />
                                    <p>Click to upload or drag and drop</p>
                                    <span>JPG, JPEG, PNG (Max 10MB)</span>
                                    <input
                                        id="file-upload"
                                        type="file"
                                        accept="image/jpeg,image/png,image/jpg"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </label>
                            ) : (
                                <div className="upload-area__preview">
                                    <img src={preview} alt="Preview" />
                                    <button className="btn btn-sm btn-secondary" onClick={() => { setPreview(null); setSelectedFile(null); setAnalysisResult(null); }}>
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>

                        {preview && !analysisResult && (
                            <button className="btn btn-primary btn-lg" onClick={handleUpload} disabled={uploading} style={{ marginTop: '16px' }}>
                                {uploading ? <><Loader2 size={18} className="spin-icon" /> Analyzing...</> : <><Upload size={18} /> Analyze Image</>}
                            </button>
                        )}

                        {uploadError && <div className="form-error" style={{ marginTop: '12px' }}>{uploadError}</div>}

                        {analysisResult && (
                            <div className="upload-results animate-scale-in">
                                <h3>Analysis Results</h3>

                                {analysisResult.annotated_image && (
                                    <div className="upload-results__image">
                                        <img src={`data:image/jpeg;base64,${analysisResult.annotated_image}`} alt="Annotated" />
                                    </div>
                                )}

                                <div className="upload-results__total">
                                    <span>Total Estimated Calories</span>
                                    <strong>{(analysisResult.total_calories || 0).toFixed(2)} kcal</strong>
                                </div>

                                {analysisResult.results && analysisResult.results.length > 0 ? (
                                    <table className="upload-results__table">
                                        <thead>
                                            <tr>
                                                <th>Food Item</th>
                                                <th>Confidence</th>
                                                <th>Mass (g)</th>
                                                <th>Calories (kcal)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysisResult.results.map((r, i) => (
                                                <tr key={i}>
                                                    <td>{r.Label}</td>
                                                    <td>{r.Confidence}</td>
                                                    <td>{r['Mass (g)']}</td>
                                                    <td>{r['Energy (kcal)']}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>No food items detected.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Analysis History</h2>
                        <p className="dashboard__tab-desc">View your past food analysis results.</p>

                        {historyLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
                        ) : historyData.length === 0 ? (
                            <div className="dashboard__empty glass-card">
                                <History size={48} color="var(--text-muted)" />
                                <p>No analysis history yet.</p>
                                <span>Upload a food image to get started!</span>
                            </div>
                        ) : (
                            <div className="history-list">
                                {historyData.map((entry, i) => (
                                    <div key={entry.id || i} className="history-item glass-card">
                                        <div className="history-item__header">
                                            <div>
                                                <h4>{entry.filename || 'Unknown file'}</h4>
                                                <span className="history-item__date">
                                                    {new Date(entry.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="history-item__actions">
                                                <span className="history-item__calories">{(entry.total_calories || 0).toFixed(1)} kcal</span>
                                                <button className="history-item__delete" onClick={() => deleteHistoryItem(entry.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        {entry.results && entry.results.length > 0 && (
                                            <div className="history-item__results">
                                                {entry.results.map((r, j) => (
                                                    <span key={j} className="history-item__tag">
                                                        {r.Label || r.label}: {r['Energy (kcal)'] || r.calories || 0} kcal
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Analysis Tab */}
                {activeTab === 'analysis' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Calorie Analysis</h2>
                        <p className="dashboard__tab-desc">Overview of all food items you've analyzed so far.</p>

                        {analysisData.length === 0 ? (
                            <div className="dashboard__empty glass-card">
                                <BarChart3 size={48} color="var(--text-muted)" />
                                <p>No data to analyze yet.</p>
                                <span>Upload food images to see your analytics!</span>
                            </div>
                        ) : (
                            <div className="analysis-charts">
                                <div className="analysis-chart glass-card">
                                    <h3>Calories per Food Item</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={analysisData}>
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
                                            <Bar dataKey="totalCalories" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="analysis-chart glass-card">
                                    <h3>Food Distribution</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={analysisData}
                                                dataKey="count"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label={({ name, count }) => `${name} (${count})`}
                                            >
                                                {analysisData.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'var(--bg-dark-card)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-primary)'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="analysis-stats">
                                    <div className="analysis-stat glass-card">
                                        <h4>Total Analyses</h4>
                                        <span>{historyData.length}</span>
                                    </div>
                                    <div className="analysis-stat glass-card">
                                        <h4>Total Calories</h4>
                                        <span>{historyData.reduce((sum, e) => sum + (e.total_calories || 0), 0).toFixed(1)}</span>
                                    </div>
                                    <div className="analysis-stat glass-card">
                                        <h4>Unique Foods</h4>
                                        <span>{analysisData.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="dashboard__tab animate-fade-in">
                        <h2>Profile Settings</h2>
                        <p className="dashboard__tab-desc">Manage your account and security settings.</p>

                        <div className="profile-section glass-card">
                            <h3>Account Information</h3>
                            <div className="profile-info">
                                <div className="profile-info__row">
                                    <span>Name</span>
                                    <span>{user?.user_metadata?.full_name || 'Not set'}</span>
                                </div>
                                <div className="profile-info__row">
                                    <span>Email</span>
                                    <span>{user?.email}</span>
                                </div>
                                <div className="profile-info__row">
                                    <span>Role</span>
                                    <span className="profile-role-badge">{userProfile?.role || 'user'}</span>
                                </div>
                                <div className="profile-info__row">
                                    <span>Member Since</span>
                                    <span>{new Date(user?.created_at || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="profile-section glass-card">
                            <h3><Lock size={18} /> Change Password</h3>

                            {profileMsg && <div className="form-success">{profileMsg}</div>}
                            {profileError && <div className="form-error">{profileError}</div>}

                            <form onSubmit={handlePasswordUpdate}>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary">
                                    <Lock size={16} /> Update Password
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
