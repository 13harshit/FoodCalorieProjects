import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import './Auth.css';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const { error } = await resetPassword(email);

        if (error) {
            setError(error.message);
        } else {
            setSuccess('Password reset email sent! Check your inbox.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-page__decoration">
                <span>🍑</span><span>🍒</span><span>🍋</span><span>🥭</span>
            </div>

            <div className="auth-card glass-card animate-scale-in">
                <div className="auth-card__header">
                    <div className="auth-card__logo">🔑</div>
                    <h1>Forgot Password</h1>
                    <p>Enter your email to receive a reset link</p>
                </div>

                {error && <div className="form-error" style={{ marginBottom: '12px', textAlign: 'center' }}>{error}</div>}
                {success && <div className="form-success" style={{ marginBottom: '12px', textAlign: 'center' }}>{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <Loader2 size={18} className="spin-icon" /> : <Mail size={18} />}
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/signin" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                        <ArrowLeft size={16} /> Back to Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
