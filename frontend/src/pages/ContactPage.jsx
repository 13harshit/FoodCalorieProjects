import { useState } from 'react';
import { Mail, MapPin, Phone, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './ContactPage.css';

export default function ContactPage() {
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error: insertError } = await supabase
            .from('contact_messages')
            .insert([{
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message
            }]);

        if (insertError) {
            setError(insertError.message);
        } else {
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 5000);
            setFormData({ name: '', email: '', subject: '', message: '' });
        }

        setLoading(false);
    };

    return (
        <div className="contact-page">
            <section className="contact-hero">
                <div className="container">
                    <h1 className="animate-fade-in-up">Get In <span className="text-gradient">Touch</span></h1>
                    <p className="contact-hero__subtitle animate-fade-in-up delay-100">
                        Have questions? We'd love to hear from you.
                    </p>
                </div>
            </section>

            <section className="contact-content section">
                <div className="container">
                    <div className="contact-grid">
                        <div className="contact-info">
                            <h2>Contact Information</h2>
                            <p>Fill out the form and we'll get back to you as soon as possible.</p>

                            <div className="contact-info__items">
                                <div className="contact-info__item">
                                    <div className="contact-info__icon">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h4>Email</h4>
                                        <p>contact@nutrivision.app</p>
                                    </div>
                                </div>
                                <div className="contact-info__item">
                                    <div className="contact-info__icon">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <h4>Phone</h4>
                                        <p>+91 XXXX-XXXXXX</p>
                                    </div>
                                </div>
                                <div className="contact-info__item">
                                    <div className="contact-info__icon">
                                        <MapPin size={20} />
                                    </div>
                                    <div>
                                        <h4>Location</h4>
                                        <p>India</p>
                                    </div>
                                </div>
                            </div>

                            <div className="contact-info__decoration">
                                <span>🍎</span><span>🍌</span><span>🥕</span><span>🍊</span>
                            </div>
                        </div>

                        <form className="contact-form glass-card" onSubmit={handleSubmit}>
                            {error && (
                                <div className="form-error" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                                    {error}
                                </div>
                            )}
                            {submitted && (
                                <div className="form-success" style={{ marginBottom: '16px', fontSize: '0.95rem' }}>
                                    ✅ Message sent successfully! We'll get back to you soon.
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Your Name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="How can we help?"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea
                                    className="form-input"
                                    rows="5"
                                    placeholder="Tell us more..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                                {loading ? <Loader2 size={16} className="spin-icon" /> : <Send size={16} />}
                                {loading ? ' Sending...' : ' Send Message'}
                            </button>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
}
