import { useState } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import './CalorieCalculator.css';

const CALORIENINJAS_KEY = import.meta.env.VITE_CALORIENINJAS_API_KEY;

export default function CalorieCalculator() {
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const popularFruits = [
        { emoji: '🍎', name: 'Apple' },
        { emoji: '🍌', name: 'Banana' },
        { emoji: '🍊', name: 'Orange' },
        { emoji: '🥝', name: 'Kiwi' },
        { emoji: '🍇', name: 'Grapes' },
        { emoji: '🍓', name: 'Strawberry' },
        { emoji: '🥭', name: 'Mango' },
        { emoji: '🍑', name: 'Peach' },
        { emoji: '🍍', name: 'Pineapple' },
        { emoji: '🫐', name: 'Blueberry' },
        { emoji: '🍒', name: 'Cherry' },
        { emoji: '🍋', name: 'Lemon' },
    ];

    // Health benefit lookup for common fruits/foods
    const healthBenefits = {
        apple: ['Rich in antioxidants & flavonoids', 'Supports heart health', 'Aids digestion with soluble fiber'],
        banana: ['Great source of potassium', 'Natural energy booster', 'Supports muscle recovery'],
        orange: ['Excellent source of Vitamin C', 'Boosts immune system', 'Promotes healthy skin'],
        kiwi: ['Packed with Vitamin C & K', 'Supports digestive health', 'Rich in antioxidants'],
        grapes: ['Rich in resveratrol antioxidant', 'Supports cardiovascular health', 'Anti-inflammatory properties'],
        strawberry: ['High in Vitamin C & manganese', 'Supports brain health', 'May help regulate blood sugar'],
        mango: ['Rich in Vitamin A & C', 'Boosts immunity', 'Supports eye health'],
        peach: ['Good source of Vitamins A & C', 'Supports skin health', 'Aids digestion'],
        pineapple: ['Contains bromelain enzyme', 'Anti-inflammatory benefits', 'Supports immune function'],
        blueberry: ['One of the highest antioxidant foods', 'Supports brain health', 'May lower blood pressure'],
        cherry: ['Rich in anti-inflammatory compounds', 'Supports sleep quality', 'Aids post-exercise recovery'],
        lemon: ['High in Vitamin C', 'Aids digestion', 'Natural detoxifier'],
        tomato: ['Rich in lycopene', 'Supports heart health', 'Good source of Vitamin C'],
        carrot: ['Excellent source of beta-carotene', 'Supports eye health', 'Boosts immune system'],
        onion: ['Contains quercetin antioxidant', 'Anti-inflammatory properties', 'Supports heart health'],
    };

    const funFacts = {
        apple: 'There are over 7,500 varieties of apples grown worldwide!',
        banana: 'Bananas are technically berries, while strawberries are not!',
        orange: 'A single orange tree can produce up to 60,000 flowers!',
        kiwi: 'Kiwis contain more Vitamin C per ounce than most other fruits!',
        grapes: 'It takes about 2.5 pounds of grapes to make one bottle of wine!',
        strawberry: 'Strawberries are the only fruit with seeds on the outside!',
        mango: 'Mangoes are related to cashews and pistachios!',
        peach: 'Peaches are a member of the rose family!',
        pineapple: 'A pineapple plant can take 2-3 years to produce a single fruit!',
        blueberry: 'Blueberries are one of the only natural foods that are truly blue!',
        cherry: 'The average cherry tree produces about 7,000 cherries per year!',
        lemon: 'Lemons contain more sugar than strawberries!',
    };

    const searchCalories = async (searchTerm) => {
        const term = searchTerm || query;
        if (!term.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(
                `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(term)}`,
                {
                    headers: {
                        'X-Api-Key': CALORIENINJAS_KEY
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                setError(`No nutritional data found for "${term}". Try a different search term.`);
                setLoading(false);
                return;
            }

            // Aggregate all items if multiple are returned
            const primaryItem = data.items[0];
            const totalCalories = data.items.reduce((sum, item) => sum + (item.calories || 0), 0);

            const nameKey = primaryItem.name?.toLowerCase();
            const benefits = healthBenefits[nameKey] || [
                'Provides essential nutrients',
                'Part of a balanced diet',
                'Contains important micronutrients'
            ];
            const fact = funFacts[nameKey] || `${primaryItem.name} is a nutritious food choice for a healthy lifestyle!`;

            // Build result in our display format
            const formattedResult = {
                name: primaryItem.name?.charAt(0).toUpperCase() + primaryItem.name?.slice(1) || term,
                serving_size: `${primaryItem.serving_size_g || 100}g serving`,
                calories: Math.round(totalCalories * 10) / 10,
                protein: Math.round((primaryItem.protein_g || 0) * 10) / 10,
                carbs: Math.round((primaryItem.carbohydrates_total_g || 0) * 10) / 10,
                fat: Math.round((primaryItem.fat_total_g || 0) * 10) / 10,
                fiber: Math.round((primaryItem.fiber_g || 0) * 10) / 10,
                sugar: Math.round((primaryItem.sugar_g || 0) * 10) / 10,
                sodium: `${Math.round(primaryItem.sodium_mg || 0)}mg`,
                potassium: `${Math.round(primaryItem.potassium_mg || 0)}mg`,
                cholesterol: `${Math.round(primaryItem.cholesterol_mg || 0)}mg`,
                fat_saturated: `${Math.round((primaryItem.fat_saturated_g || 0) * 10) / 10}g`,
                health_benefits: benefits,
                fun_fact: fact,
                all_items: data.items // Keep all items for multi-food queries
            };

            setResult(formattedResult);

            // Save to Supabase history
            setSaved(false);
            if (user) {
                try {
                    const { error: insertError } = await supabase.from('food_analysis_history').insert([{
                        user_id: user.id,
                        type: 'calorie_search',
                        filename: term,
                        search_query: term,
                        results: data.items.map(item => ({
                            name: item.name,
                            label: item.name,
                            calories: item.calories,
                            protein_g: item.protein_g,
                            carbohydrates_total_g: item.carbohydrates_total_g,
                            fat_total_g: item.fat_total_g,
                            serving_size_g: item.serving_size_g
                        })),
                        total_calories: totalCalories,
                        created_at: new Date().toISOString()
                    }]);
                    if (!insertError) setSaved(true);
                    else console.warn('Supabase save error:', insertError.message);
                } catch (e) { console.warn('Could not save to Supabase:', e); }
            }
        } catch (err) {
            console.error('CalorieNinjas API Error:', err);
            setError(`Failed to fetch nutritional data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        searchCalories();
    };

    return (
        <div className="calorie-page">
            <section className="calorie-hero">
                <div className="container">
                    <div className="calorie-hero__badge">
                        <Sparkles size={14} /> Powered by CalorieNinjas API
                    </div>
                    <h1 className="animate-fade-in-up">
                        Calorie <span className="text-gradient">Calculator</span>
                    </h1>
                    <p className="calorie-hero__subtitle animate-fade-in-up delay-100">
                        Search any fruit or food product to get detailed calorie and nutritional information.
                    </p>

                    <form className="calorie-search animate-fade-in-up delay-200" onSubmit={handleSubmit}>
                        <div className="calorie-search__input-wrap">
                            <Search size={20} className="calorie-search__icon" />
                            <input
                                type="text"
                                placeholder="Search foods... (e.g., Apple, 3lb carrots, chicken sandwich)"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="calorie-search__input"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
                            {loading ? <Loader2 size={18} className="spin-icon" /> : <Search size={18} />}
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>
                </div>
            </section>

            <section className="calorie-content section">
                <div className="container">
                    {/* Popular Fruits Quick Select */}
                    {!result && !loading && (
                        <div className="popular-fruits animate-fade-in">
                            <h3>Popular Fruits</h3>
                            <div className="popular-fruits__grid">
                                {popularFruits.map((fruit, i) => (
                                    <button
                                        key={i}
                                        className="popular-fruit glass-card"
                                        onClick={() => {
                                            setQuery(fruit.name);
                                            searchCalories(fruit.name);
                                        }}
                                    >
                                        <span className="popular-fruit__emoji">{fruit.emoji}</span>
                                        <span className="popular-fruit__name">{fruit.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="calorie-loading">
                            <div className="calorie-loading__animation">
                                <span>🍎</span>
                                <span>🔍</span>
                                <span>📊</span>
                            </div>
                            <p>Fetching nutritional data from CalorieNinjas...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="calorie-error glass-card">
                            <p>❌ {error}</p>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="calorie-result animate-scale-in">
                            <div className="calorie-result__header">
                                <h2>{result.name}</h2>
                                <span className="calorie-result__serving">{result.serving_size}</span>
                            </div>

                            <div className="calorie-result__main-stats">
                                <div className="calorie-stat calorie-stat--calories">
                                    <div className="calorie-stat__value">{result.calories}</div>
                                    <div className="calorie-stat__label">Calories</div>
                                    <div className="calorie-stat__unit">kcal</div>
                                </div>
                                <div className="calorie-stat">
                                    <div className="calorie-stat__value">{result.protein}g</div>
                                    <div className="calorie-stat__label">Protein</div>
                                </div>
                                <div className="calorie-stat">
                                    <div className="calorie-stat__value">{result.carbs}g</div>
                                    <div className="calorie-stat__label">Carbs</div>
                                </div>
                                <div className="calorie-stat">
                                    <div className="calorie-stat__value">{result.fat}g</div>
                                    <div className="calorie-stat__label">Fat</div>
                                </div>
                            </div>

                            <div className="calorie-result__details">
                                <div className="calorie-detail glass-card">
                                    <h4>Detailed Nutrients</h4>
                                    <div className="calorie-detail__list">
                                        <div className="calorie-detail__item">
                                            <span>Fiber</span><span>{result.fiber}g</span>
                                        </div>
                                        <div className="calorie-detail__item">
                                            <span>Sugar</span><span>{result.sugar}g</span>
                                        </div>
                                        <div className="calorie-detail__item">
                                            <span>Saturated Fat</span><span>{result.fat_saturated}</span>
                                        </div>
                                        <div className="calorie-detail__item">
                                            <span>Sodium</span><span>{result.sodium}</span>
                                        </div>
                                        <div className="calorie-detail__item">
                                            <span>Potassium</span><span>{result.potassium}</span>
                                        </div>
                                        <div className="calorie-detail__item">
                                            <span>Cholesterol</span><span>{result.cholesterol}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="calorie-detail glass-card">
                                    <h4>Health Benefits</h4>
                                    <ul className="calorie-benefits">
                                        {result.health_benefits?.map((benefit, i) => (
                                            <li key={i}>✅ {benefit}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="calorie-detail glass-card calorie-fun-fact">
                                    <h4>💡 Fun Fact</h4>
                                    <p>{result.fun_fact}</p>
                                </div>
                            </div>

                            {/* Multi-item results */}
                            {result.all_items && result.all_items.length > 1 && (
                                <div className="calorie-multi glass-card" style={{ marginTop: '20px', padding: '20px' }}>
                                    <h4>All Items in Query</h4>
                                    <table className="upload-results__table" style={{ marginTop: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Serving</th>
                                                <th>Calories</th>
                                                <th>Protein</th>
                                                <th>Carbs</th>
                                                <th>Fat</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.all_items.map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ textTransform: 'capitalize' }}>{item.name}</td>
                                                    <td>{item.serving_size_g}g</td>
                                                    <td>{item.calories}</td>
                                                    <td>{item.protein_g}g</td>
                                                    <td>{item.carbohydrates_total_g}g</td>
                                                    <td>{item.fat_total_g}g</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <button
                                className="btn btn-secondary"
                                onClick={() => { setResult(null); setQuery(''); }}
                                style={{ marginTop: '24px' }}
                            >
                                Search Another Food
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
