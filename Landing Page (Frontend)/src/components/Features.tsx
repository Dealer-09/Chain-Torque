import { motion } from 'framer-motion'

export default function Features() {
    const features = [
        {
            title: 'Instant Access',
            icon: 'fa-bolt',
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            accent: 'from-amber-400 to-orange-500',
            desc: 'Upload and visualize your CAD models in seconds with our optimized pipeline.',
        },
        {
            title: 'On-Chain Security',
            icon: 'fa-shield-halved',
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/10',
            accent: 'from-cyan-400 to-blue-500',
            desc: 'Your intellectual property is protected by blockchain-backed ownership verification.',
        },
        {
            title: 'Intuitive UX',
            icon: 'fa-compass',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            accent: 'from-emerald-400 to-teal-500',
            desc: 'A seamless interface designed specifically for engineers and 3D artists.',
        },
    ]

    return (
        <section className="px-6 py-28 md:py-36 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Engineered for <span className="text-gradient">Innovators</span>
                    </h2>
                    <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        Our platform combines cutting-edge Web3 technology with an intuitive design experience.
                    </p>
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            className="card group cursor-default relative overflow-hidden"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6 }}
                        >
                            {/* Accent stripe */}
                            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                            <motion.div
                                className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                                <i className={`fas ${feature.icon} ${feature.color} text-xl`} />
                            </motion.div>
                            <h3 className="text-lg font-heading font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                {feature.title}
                            </h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
