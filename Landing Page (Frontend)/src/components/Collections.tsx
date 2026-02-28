import { motion } from 'framer-motion'

export default function Collections() {
    const collections = [
        {
            title: 'Mechanical Parts',
            desc: 'Precision-engineered gears, joints, and industrial components for manufacturing workflows.',
            icon: 'fa-cog',
            accentColor: 'var(--accent-primary)',
            iconBg: 'rgba(13, 148, 136, 0.1)',
        },
        {
            title: 'Architectural',
            desc: 'Stunning 3D building models, urban layouts, and interior designs for architects.',
            icon: 'fa-building',
            accentColor: 'var(--accent-blue)',
            iconBg: 'rgba(59, 110, 246, 0.1)',
        },
        {
            title: '3D Printables',
            desc: 'Optimized, manifold models ready for immediate 3D printing and prototyping.',
            icon: 'fa-print',
            accentColor: 'var(--accent-secondary)',
            iconBg: 'rgba(212, 160, 83, 0.1)',
        },
    ]

    return (
        <section className="py-28 md:py-36 px-6 relative" id="library">
            <div className="max-w-6xl mx-auto">
                {/* Section Header */}
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
                        Model Library
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Curated <span className="text-gradient">Collections</span>
                    </h2>
                    <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        Explore the finest 3D models hand-picked by our curators for quality and precision.
                    </p>
                </motion.div>

                {/* Cards */}
                <div className="grid md:grid-cols-3 gap-6">
                    {collections.map((collection, index) => (
                        <motion.div
                            key={collection.title}
                            className="card cursor-default group"
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6 }}
                        >
                            {/* Top accent bar */}
                            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: collection.accentColor }} />

                            <div className="card-icon" style={{ background: collection.iconBg, color: collection.accentColor }}>
                                <i className={`fas ${collection.icon}`} />
                            </div>

                            <h3 className="text-xl font-heading font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                                {collection.title}
                            </h3>
                            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {collection.desc}
                            </p>
                            <a href="#" className="font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-300"
                                style={{ color: collection.accentColor }}>
                                View Collection <i className="fas fa-chevron-right text-xs" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
