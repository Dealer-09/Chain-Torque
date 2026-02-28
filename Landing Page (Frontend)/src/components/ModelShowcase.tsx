import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function ModelShowcase() {
    const sectionRef = useRef<HTMLElement>(null)
    const viewerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (viewerRef.current && sectionRef.current) {
            gsap.fromTo(viewerRef.current, 
                { y: 80, opacity: 0.5 },
                {
                    y: 0,
                    opacity: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 80%',
                        end: 'center center',
                        scrub: 1,
                    }
                }
            )
        }
    }, [])

    const cardVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: i * 0.15,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
            },
        }),
    }

    return (
        <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    {/* Left - 3D Viewer */}
                    <div ref={viewerRef}>
                        <div className="relative">
                            <div
                                className="relative rounded-2xl overflow-hidden glass-card shadow-lg bg-slate-900/10"
                                style={{ aspectRatio: '16/10' }}
                            >
                                <iframe
                                    title="Engine"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="autoplay; fullscreen; xr-spatial-tracking"
                                    src="https://sketchfab.com/models/eea9d9252ab14298b50699a471dc2cee/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_theme=dark"
                                    className="w-full h-full"
                                    style={{ minHeight: '400px' }}
                                />
                            </div>
                            <motion.div 
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full text-xs font-bold text-slate-500"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                viewport={{ once: true }}
                            >
                                <i className="fas fa-mouse-pointer mr-2" />INTERACT IN 3D
                            </motion.div>
                        </div>
                    </div>

                    {/* Right - Details */}
                    <motion.div
                        initial={{ opacity: 0, x: 60 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        viewport={{ once: true, margin: '-100px' }}
                    >
                        <motion.div 
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            viewport={{ once: true }}
                        >
                            <span className="relative flex h-2 w-2">
                                <motion.span 
                                    className="absolute inline-flex h-full w-full rounded-full bg-indigo-400"
                                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                            </span>
                            Premium Experience
                        </motion.div>

                        <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight text-slate-950 dark:text-white">
                            Visualize Excellence <br /><span className="text-gradient">In Full 3D</span>
                        </h2>

                        <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                            Don't just look at images. Inspect high-fidelity CAD models directly in your browser with our integrated
                            WebGL viewer.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-6 mb-10">
                            {[
                                { icon: 'fa-vr-cardboard', color: 'indigo', title: '360° Preview', desc: 'Inspect every angle and detail' },
                                { icon: 'fa-shield-alt', color: 'purple', title: 'Blockchain Verification', desc: 'True ownership on-chain' },
                            ].map((card, i) => (
                                <motion.div
                                    key={card.title}
                                    className={`p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-${card.color}-500/50 transition-colors group`}
                                    custom={i}
                                    variants={cardVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true }}
                                    whileHover={{ y: -5, scale: 1.02 }}
                                >
                                    <motion.div 
                                        className={`w-10 h-10 rounded-xl bg-${card.color}-500/20 flex items-center justify-center mb-3`}
                                        whileHover={{ scale: 1.2, rotate: 10 }}
                                        transition={{ type: "spring", stiffness: 300 }}
                                    >
                                        <i className={`fas ${card.icon} text-${card.color}-400`} />
                                    </motion.div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{card.title}</h4>
                                    <p className="text-xs text-slate-500">{card.desc}</p>
                                </motion.div>
                            ))}
                        </div>

                        <motion.a 
                            href="#" 
                            className="glass-button inline-flex items-center gap-3"
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Join the Community
                            <motion.i 
                                className="fas fa-arrow-right"
                                animate={{ x: [0, 5, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />
                        </motion.a>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
