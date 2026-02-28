import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Collections() {
    const collections = [
        {
            title: 'Mechanical Parts',
            desc: 'Precision-engineered gears, joints, and industrial components.',
            icon: 'fa-cog',
            accent: 'from-cyan-400 to-blue-500',
            iconBg: 'bg-cyan-500/12',
            iconColor: 'text-cyan-400',
        },
        {
            title: 'Architectural',
            desc: 'Stunning 3D building models, urban layouts, and interiors.',
            icon: 'fa-building',
            accent: 'from-purple-400 to-indigo-500',
            iconBg: 'bg-purple-500/12',
            iconColor: 'text-purple-400',
        },
        {
            title: '3D Printables',
            desc: 'Optimized, manifold models ready for immediate 3D printing.',
            icon: 'fa-print',
            accent: 'from-amber-400 to-orange-500',
            iconBg: 'bg-amber-500/12',
            iconColor: 'text-amber-400',
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
                        <CollectionCard key={collection.title} collection={collection} index={index} />
                    ))}
                </div>
            </div>
        </section>
    )
}

function CollectionCard({ collection, index }: { collection: any; index: number }) {
    const [hovered, setHovered] = useState(false)

    return (
        <motion.div
            className="card cursor-default group"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            whileHover={{ y: -6 }}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {/* Accent top stripe */}
            <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${collection.accent} rounded-full transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`} />

            <div className={`card-icon ${collection.iconBg} ${collection.iconColor}`}>
                <i className={`fas ${collection.icon}`} />
            </div>

            <h3 className="text-xl font-heading font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                {collection.title}
            </h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {collection.desc}
            </p>
            <a href="#" className={`${collection.iconColor} font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all duration-300`}>
                View Collection <i className="fas fa-chevron-right text-xs" />
            </a>
        </motion.div>
    )
}
