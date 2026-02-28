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

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2,
        },
    },
}

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
        },
    },
}

const starVariants = {
    hidden: { opacity: 0, scale: 0, rotate: -90 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: {
            delay: i * 0.08,
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1],
        },
    }),
}

export default function Testimonials() {
    return (
        <section className="py-32 px-6 relative" id="testimonials">
            <div className="section-divider mb-20" />

            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Voices of the <span className="text-gradient">Future</span>
                    </h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400">
                        Join thousands of creators who've already switched to ChainTorque.
                    </p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-3 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                >
                    {reviews.map((review) => (
                        <motion.div
                            key={review.name}
                            className="card-modern glass-card hover:border-indigo-500/20 transition-colors"
                            variants={cardVariants}
                            whileHover={{
                                y: -8,
                                scale: 1.02,
                                transition: { duration: 0.3, ease: 'easeOut' },
                            }}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <motion.img
                                    src={review.img}
                                    alt={review.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/30"
                                    whileHover={{ scale: 1.1, borderColor: 'rgba(79, 70, 229, 0.6)' }}
                                />
                                <div>
                                    <h4 className="font-bold">{review.name}</h4>
                                    <p className="text-xs text-indigo-400 font-bold tracking-wider uppercase">{review.role}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 italic leading-relaxed">"{review.text}"</p>
                            <div className="mt-6 flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <motion.i
                                        key={i}
                                        className="fas fa-star text-yellow-500 text-sm"
                                        custom={i}
                                        variants={starVariants}
                                        initial="hidden"
                                        whileInView="visible"
                                        viewport={{ once: true }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
