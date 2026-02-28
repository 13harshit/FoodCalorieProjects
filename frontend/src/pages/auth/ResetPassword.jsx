import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import './Auth.css';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const { updatePassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        const { error } = await updatePassword(password);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page__decoration">
                <span>🍍</span><span>🫐</span><span>🍓</span><span>🍇</span>
            </div>

            <div className="auth-card glass-card animate-scale-in">
                <div className="auth-card__header">
                    <div className="auth-card__logo">🔐</div>
                    <h1>Reset Password</h1>
                    <p>Enter your new password below</p>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <CheckCircle size={48} color="#22C55E" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: '#22C55E', fontWeight: 600 }}>Password updated successfully!</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>Redirecting to dashboard...</p>
                    </div>
                ) : (
                    <>
                        {error && <div className="form-error" style={{ marginBottom: '12px', textAlign: 'center' }}>{error}</div>}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">New Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Min 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin-icon" /> : <Lock size={18} />}
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
