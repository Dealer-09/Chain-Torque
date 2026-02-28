import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export default function ModelShowcase() {

    const textVariants = {
        hidden: {},
        visible: {
            transition: { staggerChildren: 0.1, delayChildren: 0.2 },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, x: 30 },
        visible: {
            opacity: 1,
            x: 0,
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
        },
    }

    const features = [
        {
            icon: 'fa-vr-cardboard',
            color: 'var(--accent-primary)',
            title: '360° Preview',
            desc: 'Inspect every angle and detail in real-time',
        },
        {
            icon: 'fa-shield-alt',
            color: 'var(--accent-purple)',
            title: 'Blockchain Verification',
            desc: 'True ownership verified on-chain',
        },
    ]

    return (
        <section className="py-28 md:py-36 px-6 relative overflow-hidden section-warm">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-16 items-center">
                    {/* Left — 3D Viewer */}
                    <motion.div
                        className="w-full"
                        initial={{ opacity: 0, x: -40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="relative group w-full">
                            <div
                                className="relative rounded-2xl overflow-hidden transition-all duration-700 min-h-[450px] w-full"
                                style={{ 
                                    aspectRatio: '16/11',
                                    border: '1px solid var(--card-border)',
                                    background: 'rgba(10, 15, 30, 0.5)',
                                    boxShadow: 'var(--shadow-lg)'
                                }}
                            >
                                {/* Decorative top gradient line */}
                                <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
                                    style={{ background: 'linear-gradient(90deg, transparent, var(--accent-primary), var(--accent-blue), transparent)' }} />
                                
                                <iframe
                                    title="Engine"
                                    loading="lazy"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="autoplay; fullscreen; xr-spatial-tracking"
                                    src="https://sketchfab.com/models/eea9d9252ab14298b50699a471dc2cee/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_theme=dark"
                                    className="w-full h-full relative z-0"
                                />
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2"
                                style={{ background: 'var(--glass-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)', backdropFilter: 'blur(12px)' }}>
                                <i className="fas fa-hand-pointer" />
                                INTERACT IN 3D
                            </div>
                        </div>
                    </motion.div>

                    {/* Right — Details */}
                    <motion.div
                        variants={textVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-100px' }}
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6"
                            style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid rgba(13, 148, 136, 0.15)', color: 'var(--accent-primary)' }}>
                            <span className="relative flex h-2 w-2">
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--accent-primary)' }} />
                            </span>
                            Premium Experience
                        </motion.div>

                        <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
                            Visualize Excellence <br /><span className="text-gradient">In Full 3D</span>
                        </motion.h2>

                        <motion.p variants={itemVariants} className="text-base md:text-lg mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            Don't just look at images. Inspect high-fidelity CAD models directly in your browser with our integrated
                            WebGL viewer.
                        </motion.p>

                        <motion.div variants={itemVariants} className="space-y-3 mb-10">
                            {features.map((f) => (
                                <motion.div
                                    key={f.title}
                                    className="card-bordered group cursor-default flex items-start gap-4"
                                    whileHover={{ x: 4 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    style={{ borderLeftColor: f.color }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300"
                                        style={{ background: `${f.color}15` }}>
                                        <i className={`fas ${f.icon}`} style={{ color: f.color }} />
                                    </div>
                                    <div>
                                        <h4 className="font-heading font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{f.title}</h4>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Link to="/sign-up">
                                <motion.span
                                    className="btn-primary inline-flex items-center gap-3"
                                    whileHover={{ scale: 1.04, y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Join the Community
                                    <i className="fas fa-arrow-right" />
                                </motion.span>
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
