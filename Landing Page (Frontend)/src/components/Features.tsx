import { motion } from 'framer-motion'

export default function Features() {
    const features = [
        {
            title: 'Instant Access',
            icon: 'fa-bolt',
            accentColor: 'var(--accent-secondary)',
            iconBg: 'rgba(212, 160, 83, 0.1)',
            desc: 'Upload and visualize your CAD models in seconds with our optimized pipeline.',
        },
        {
            title: 'On-Chain Security',
            icon: 'fa-shield-halved',
            accentColor: 'var(--accent-primary)',
            iconBg: 'rgba(13, 148, 136, 0.1)',
            desc: 'Your intellectual property is protected by blockchain-backed ownership verification.',
        },
        {
            title: 'Intuitive UX',
            icon: 'fa-compass',
            accentColor: 'var(--accent-blue)',
            iconBg: 'rgba(59, 110, 246, 0.1)',
            desc: 'A seamless interface designed specifically for engineers and 3D artists.',
        },
    ]

    return (
        <section className="px-6 py-28 md:py-36 relative overflow-hidden section-dark">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-secondary)' }}>
                        Why ChainTorque
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4 text-white">
                        Engineered for <span className="text-gradient-warm">Innovators</span>
                    </h2>
                    <p className="text-base md:text-lg max-w-2xl mx-auto text-gray-400">
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
                            {/* Left accent stripe */}
                            <div className="absolute top-4 bottom-4 left-0 w-[3px] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: feature.accentColor }} />

                            <motion.div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                                style={{ background: feature.iconBg }}
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                            >
                                <i className={`fas ${feature.icon} text-xl`} style={{ color: feature.accentColor }} />
                            </motion.div>
                            <h3 className="text-lg font-heading font-semibold mb-3 text-white">
                                {feature.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-gray-400">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
