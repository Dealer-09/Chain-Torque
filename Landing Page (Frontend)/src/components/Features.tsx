import { motion } from 'framer-motion'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
        },
    },
}

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.9 },
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

export default function Features() {
    const features = [
        {
            title: 'Instant Access',
            icon: 'fa-bolt',
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
            hoverBorder: 'hover:border-yellow-400/30',
            desc: 'Upload and visualize your CAD models in seconds with our optimized pipeline.',
        },
        {
            title: 'On-Chain Security',
            icon: 'fa-shield-halved',
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10',
            hoverBorder: 'hover:border-indigo-400/30',
            desc: 'Your intellectual property is protected by blockchain-backed ownership verification.',
        },
        {
            title: 'Intuitive UX',
            icon: 'fa-compass',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            hoverBorder: 'hover:border-emerald-400/30',
            desc: 'A seamless interface designed specifically for engineers and 3D artists.',
        },
    ]

    return (
        <section className="px-6 py-32 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true, margin: '-80px' }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Engineered for <span className="text-gradient">Innovators</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Our platform combines cutting-edge Web3 technology with an intuitive design experience.
                    </p>
                </motion.div>

                <motion.div
                    className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                >
                    {features.map((feature) => (
                        <motion.div
                            key={feature.title}
                            className={`card-modern glass-card group ${feature.hoverBorder} transition-colors`}
                            variants={cardVariants}
                            whileHover={{
                                y: -10,
                                scale: 1.03,
                                transition: { duration: 0.3, ease: 'easeOut' },
                            }}
                        >
                            <motion.div
                                className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}
                                whileHover={{ scale: 1.15, rotate: 8 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <i className={`fas ${feature.icon} ${feature.color} text-2xl`} />
                            </motion.div>
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
