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
        <section className="py-28 md:py-36 px-6 relative" id="testimonials" style={{ background: 'var(--bg-secondary)' }}>
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Voices of the <span className="text-gradient">Future</span>
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        Join thousands of creators who've already switched to ChainTorque.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6">
                    {reviews.map((review, index) => (
                        <motion.div
                            key={review.name}
                            className="card group cursor-default"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6 }}
                        >
                            {/* Quote icon */}
                            <div className="mb-4 text-2xl opacity-15" style={{ color: 'var(--accent-cyan)' }}>
                                <i className="fas fa-quote-left" />
                            </div>

                            <p className="text-sm leading-relaxed mb-6 italic" style={{ color: 'var(--text-secondary)' }}>
                                "{review.text}"
                            </p>

                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    src={review.img}
                                    alt={review.name}
                                    className="w-11 h-11 rounded-full object-cover ring-2 ring-offset-2 ring-offset-transparent"
                                    style={{ borderColor: 'var(--card-border)' }}
                                />
                                <div>
                                    <h4 className="font-heading font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{review.name}</h4>
                                    <p className="text-xs font-medium" style={{ color: 'var(--accent-cyan)' }}>{review.role}</p>
                                </div>
                            </div>

                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
