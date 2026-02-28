import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Camera, Brain, BarChart3 } from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
    const features = [
        {
            icon: <Camera size={28} />,
            title: 'Snap & Analyze',
            description: 'Upload a photo of your food and our YOLOv5 model detects individual items instantly.',
            color: 'var(--color-primary)'
        },
        {
            icon: <Brain size={28} />,
            title: 'AI-Powered Estimation',
            description: 'Leveraging Gemini AI and computer vision to accurately estimate calories from any fruit or food item.',
            color: 'var(--color-secondary)'
        },
        {
            icon: <BarChart3 size={28} />,
            title: 'Track & Analyze',
            description: 'View detailed analytics, track your calorie intake history, and gain insights into your nutrition.',
            color: 'var(--color-accent)'
        },
        {
            icon: <Sparkles size={28} />,
            title: 'Smart Dashboard',
            description: 'Personalized dashboard with history, analytics charts, and comprehensive profile management.',
            color: '#A78BFA'
        }
    ];

    const foodEmojis = ['🍎', '🍌', '🥕', '🍊', '🥝', '🍕', '🍅', '🧅', '🥑', '🍇', '🍓', '🫐', '🍑', '🥭'];

    return (
        <div className="landing">
            {/* Hero Section */}
            <section className="hero">
                {/* Floating Food Emojis */}
                <div className="hero__food-particles">
                    {foodEmojis.map((emoji, i) => (
                        <span
                            key={i}
                            className="hero__food-particle"
                            style={{
                                left: `${5 + (i * 7) % 90}%`,
                                top: `${10 + (i * 13) % 80}%`,
                                animationDelay: `${i * 0.5}s`,
                                animationDuration: `${4 + (i % 4)}s`,
                                fontSize: `${1.5 + (i % 3) * 0.5}rem`
                            }}
                        >
                            {emoji}
                        </span>
                    ))}
                </div>

                {/* Gradient Orbs */}
                <div className="hero__orb hero__orb--1"></div>
                <div className="hero__orb hero__orb--2"></div>
                <div className="hero__orb hero__orb--3"></div>

                <div className="hero__content container">
                    <div className="hero__badge animate-fade-in-up">
                        <Sparkles size={14} />
                        AI-Powered Food Analysis
                    </div>

                    <h1 className="hero__title animate-fade-in-up delay-100">
                        Know What You Eat.
                        <span className="hero__title-gradient"> Track Every Calorie.</span>
                    </h1>

                    <p className="hero__subtitle animate-fade-in-up delay-200">
                        Upload a food photo or search any fruit — our deep learning model and Gemini AI
                        will estimate the calories for you in seconds. Start your nutrition journey today.
                    </p>

                    <div className="hero__actions animate-fade-in-up delay-300">
                        <Link to="/calorie-calculator" className="btn btn-primary btn-lg">
                            Try Calorie Calculator <ArrowRight size={18} />
                        </Link>
                        <Link to="/signup" className="btn btn-secondary btn-lg">
                            Get Started Free
                        </Link>
                    </div>

                    {/* Animated Food Plate */}
                    <div className="hero__plate-container animate-fade-in-up delay-400">
                        <div className="hero__plate">
                            <div className="hero__plate-ring"></div>
                            <div className="hero__plate-items">
                                <span className="hero__plate-item" style={{ '--delay': '0s', '--angle': '0deg' }}>🍎</span>
                                <span className="hero__plate-item" style={{ '--delay': '0.3s', '--angle': '60deg' }}>🍌</span>
                                <span className="hero__plate-item" style={{ '--delay': '0.6s', '--angle': '120deg' }}>🍊</span>
                                <span className="hero__plate-item" style={{ '--delay': '0.9s', '--angle': '180deg' }}>🥝</span>
                                <span className="hero__plate-item" style={{ '--delay': '1.2s', '--angle': '240deg' }}>🍅</span>
                                <span className="hero__plate-item" style={{ '--delay': '1.5s', '--angle': '300deg' }}>🥕</span>
                            </div>
                            <div className="hero__plate-center">
                                <span className="hero__plate-cal">AI</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features section">
                <div className="container">
                    <div className="features__header">
                        <h2 className="features__title">Powerful Features</h2>
                        <p className="features__subtitle">
                            Everything you need to understand your food's nutritional content
                        </p>
                    </div>

                    <div className="features__grid">
                        {features.map((feature, i) => (
                            <div
                                key={i}
                                className="feature-card glass-card"
                                style={{ animationDelay: `${i * 100}ms` }}
                            >
                                <div className="feature-card__icon" style={{ color: feature.color, background: `${feature.color}15` }}>
                                    {feature.icon}
                                </div>
                                <h3 className="feature-card__title">{feature.title}</h3>
                                <p className="feature-card__desc">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works section">
                <div className="container">
                    <h2 className="how-it-works__title">How It Works</h2>
                    <div className="how-it-works__steps">
                        <div className="step">
                            <div className="step__number">01</div>
                            <div className="step__icon">📸</div>
                            <h3>Upload or Search</h3>
                            <p>Take a photo of your food or search for any fruit in our calorie calculator.</p>
                        </div>
                        <div className="step__connector"></div>
                        <div className="step">
                            <div className="step__number">02</div>
                            <div className="step__icon">🧠</div>
                            <h3>AI Analysis</h3>
                            <p>Our YOLOv5 model detects food items. Gemini AI provides detailed nutritional info.</p>
                        </div>
                        <div className="step__connector"></div>
                        <div className="step">
                            <div className="step__number">03</div>
                            <div className="step__icon">📊</div>
                            <h3>Get Results</h3>
                            <p>View calorie estimates, track your history, and analyze your nutrition patterns.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta section">
                <div className="container">
                    <div className="cta__card glass-card">
                        <div className="cta__food-bg">
                            <span>🍎</span><span>🍌</span><span>🥕</span><span>🍊</span>
                        </div>
                        <h2>Ready to Start Your Nutrition Journey?</h2>
                        <p>Join NutriVision and get instant calorie estimates powered by AI.</p>
                        <div className="cta__actions">
                            <Link to="/signup" className="btn btn-primary btn-lg">
                                Create Free Account <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
