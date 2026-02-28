import { Heart, Code, Cpu, Eye } from 'lucide-react';
import './AboutPage.css';

export default function AboutPage() {
    const techStack = [
        { icon: '🐍', name: 'Python', desc: 'Backend API logic' },
        { icon: '🔥', name: 'PyTorch / YOLOv5', desc: 'Object detection model' },
        { icon: '⚛️', name: 'React', desc: 'Frontend framework' },
        { icon: '🤖', name: 'Gemini AI', desc: 'Calorie estimation' },
        { icon: '🔐', name: 'Supabase', desc: 'Auth & Database' },
        { icon: '👁️', name: 'OpenCV', desc: 'Computer vision' },
    ];

    return (
        <div className="about-page">
            <section className="about-hero">
                <div className="container">
                    <h1 className="animate-fade-in-up">About <span className="text-gradient">NutriVision</span></h1>
                    <p className="about-hero__subtitle animate-fade-in-up delay-100">
                        Using deep learning and computer vision to make calorie estimation effortless.
                    </p>
                </div>
            </section>

            <section className="about-mission section">
                <div className="container">
                    <div className="about-mission__grid">
                        <div className="about-mission__text">
                            <h2>Our Mission</h2>
                            <p>
                                NutriVision was born from the idea that understanding what you eat shouldn't be complicated.
                                We combine cutting-edge AI technology with intuitive design to help you make informed
                                decisions about your nutrition.
                            </p>
                            <p>
                                Our system uses a custom-trained YOLOv5 model to detect food items from photos,
                                and Google's Gemini AI to provide comprehensive nutritional information for any
                                fruit or food product you search.
                            </p>
                        </div>
                        <div className="about-mission__visual">
                            <div className="about-mission__card glass-card">
                                <div className="about-mission__emoji-grid">
                                    <span>🍎</span><span>🍌</span><span>🥕</span>
                                    <span>🍊</span><span>🧠</span><span>🥝</span>
                                    <span>🍅</span><span>🍕</span><span>📊</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-values section">
                <div className="container">
                    <h2 className="text-center">What Drives Us</h2>
                    <div className="about-values__grid">
                        <div className="about-value glass-card">
                            <Eye size={32} color="var(--color-primary)" />
                            <h3>Computer Vision</h3>
                            <p>Advanced object detection to identify food items in real-time photos.</p>
                        </div>
                        <div className="about-value glass-card">
                            <Cpu size={32} color="var(--color-secondary)" />
                            <h3>Deep Learning</h3>
                            <p>Custom trained neural networks for accurate food classification and analysis.</p>
                        </div>
                        <div className="about-value glass-card">
                            <Code size={32} color="var(--color-accent)" />
                            <h3>Modern Tech</h3>
                            <p>Built with React, FastAPI, Supabase, and Gemini AI for a seamless experience.</p>
                        </div>
                        <div className="about-value glass-card">
                            <Heart size={32} color="#EF4444" />
                            <h3>Health First</h3>
                            <p>Empowering users to make better nutritional decisions one meal at a time.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="about-tech section">
                <div className="container">
                    <h2 className="text-center">Technology Stack</h2>
                    <div className="about-tech__grid">
                        {techStack.map((tech, i) => (
                            <div key={i} className="about-tech__item glass-card">
                                <span className="about-tech__icon">{tech.icon}</span>
                                <h4>{tech.name}</h4>
                                <p>{tech.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
