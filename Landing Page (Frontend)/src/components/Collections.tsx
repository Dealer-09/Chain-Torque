import { motion } from 'framer-motion'

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
    hidden: { opacity: 0, y: 50, scale: 0.9 },
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

export default function Collections() {
    const collections = [
        {
            title: 'Mechanical Parts',
            desc: 'Precision-engineered gears, joints, and industrial components.',
            icon: 'fa-cog',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            linkColor: 'text-blue-400',
            hoverBorder: 'hover:border-blue-500/30',
        },
        {
            title: 'Architectural',
            desc: 'Stunning 3D building models, urban layouts, and interiors.',
            icon: 'fa-building',
            iconBg: 'bg-purple-500/20',
            iconColor: 'text-purple-400',
            linkColor: 'text-purple-400',
            hoverBorder: 'hover:border-purple-500/30',
        },
        {
            title: '3D Printables',
            desc: 'Optimized, manifold models ready for immediate 3D printing.',
            icon: 'fa-print',
            iconBg: 'bg-pink-500/20',
            iconColor: 'text-pink-400',
            linkColor: 'text-pink-400',
            hoverBorder: 'hover:border-pink-500/30',
        },
    ]

    return (
        <section className="py-32 px-6 relative" id="library">
            {/* Section divider */}
            <div className="section-divider mb-20" />

            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true, margin: '-80px' }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Curated <span className="text-gradient">Collections</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Explore the finest 3D models hand-picked by our curators for quality and precision.
                    </p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-3 gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                >
                    {collections.map((collection) => (
                        <motion.div
                            key={collection.title}
                            className={`card-modern glass-card ${collection.hoverBorder} transition-colors`}
                            variants={cardVariants}
                            whileHover={{
                                y: -10,
                                scale: 1.02,
                                rotateX: 2,
                                rotateY: -2,
                                transition: { duration: 0.3, ease: 'easeOut' },
                            }}
                            style={{ transformPerspective: 800 }}
                        >
                            <motion.div
                                className={`card-icon ${collection.iconBg} ${collection.iconColor}`}
                                whileHover={{ scale: 1.2, rotate: 15 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <i className={`fas ${collection.icon}`} />
                            </motion.div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{collection.title}</h3>
                            <p className="text-slate-400 mb-6">{collection.desc}</p>
                            <motion.a
                                href="#"
                                className={`${collection.linkColor} font-bold flex items-center gap-2 transition-all`}
                                whileHover={{ x: 5 }}
                            >
                                View Collection <i className="fas fa-chevron-right text-xs" />
                            </motion.a>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
