import { Star } from 'lucide-react'
import { motion } from 'framer-motion'

const reviews = [
    {
        name: 'Arjun Mehta',
        role: 'Mechanical Engineer',
        img: '/images/user1.jpg',
        text: 'ChainTorque has completely redefined my workflow. The integration of 3D previews with blockchain ownership is a game-changer.',
    },
    {
        name: 'Rhea Das',
        role: '3D Model Artist',
        img: '/images/user2.jpg',
        text: 'Finally, a platform that respects creators. The UI is gorgeous, and the community is incredibly supportive and professional.',
    },
    {
        name: 'Imran Shaikh',
        role: 'Product Designer',
        img: '/images/user3.jpg',
        text: "The speed and security of this platform are unmatched. It's the only marketplace I trust for my high-fidelity CAD assets.",
    },
]

export default function Testimonials() {
    return (
        <section className="py-28 md:py-36 px-6 relative" id="testimonials">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>
                        Testimonials
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Voices of the <span className="text-gradient-warm">Community</span>
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        Join thousands of creators who've already switched to ChainTorque.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {reviews.map((review, index) => (
                        <motion.div
                            key={review.name}
                            className="card-elevated group cursor-default"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6 }}
                        >
                            {/* Large decorative quote */}
                            <div className="text-5xl font-serif leading-none mb-3 select-none" style={{ color: 'var(--accent-primary)', opacity: 0.15 }}>
                                "
                            </div>

                            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                                {review.text}
                            </p>

                            <div className="flex items-center gap-3 mb-3 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
                                <img
                                    src={review.img}
                                    alt={review.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                    style={{ border: '2px solid var(--card-border)' }}
                                />
                                <div>
                                    <h4 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{review.name}</h4>
                                    <p className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>{review.role}</p>
                                </div>
                            </div>

                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--accent-secondary)' }} />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
