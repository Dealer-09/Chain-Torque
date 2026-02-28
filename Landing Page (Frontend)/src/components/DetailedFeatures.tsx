import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function DetailedFeatures() {
    const detailedFeatures = [
        { icon: 'fa-cubes', title: 'Real-time 3D Previews', desc: 'Instantly visualize your CAD models online with zero lag.' },
        { icon: 'fa-lock', title: 'Secure Uploads', desc: 'Military-grade encryption for all your proprietary designs.' },
        { icon: 'fa-share-nodes', title: 'Easy Sharing', desc: 'Collaborate effortlessly with teammates across the globe.' },
    ]

    const imageRef = useRef<HTMLDivElement>(null)
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (imageRef.current && sectionRef.current) {
            gsap.fromTo(imageRef.current,
                { y: 40, rotate: 3 },
                {
                    y: -20,
                    rotate: -1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 70%',
                        end: 'bottom 30%',
                        scrub: 2,
                    }
                }
            )
        }
    }, [])

    const featureVariants = {
        hidden: { opacity: 0, x: -30 },
        visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: {
                delay: i * 0.15,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
            },
        }),
    }

    return (
        <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden" id="features">
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true, margin: '-100px' }}
                >
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                        Tools for the <br /><span className="text-gradient">Next Generation</span>
                    </h2>

                    <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                        Whether you're a solo creator or a global enterprise, our platform scales with your ambition.
                    </p>

                    <div className="space-y-6">
                        {detailedFeatures.map((f, i) => (
                            <motion.div
                                key={f.title}
                                className="flex gap-5 group"
                                custom={i}
                                variants={featureVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                whileHover={{ x: 10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <motion.div
                                    className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors"
                                    whileHover={{ scale: 1.15, rotate: 8 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                >
                                    <i className={`fas ${f.icon} text-indigo-400`} />
                                </motion.div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{f.title}</h4>
                                    <p className="text-sm text-slate-500">{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        className="mt-12 flex flex-wrap gap-4"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        viewport={{ once: true }}
                    >
                        <motion.a
                            href="#"
                            className="glass-button"
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Start Free Trial
                        </motion.a>
                        <motion.a
                            href="#"
                            className="px-8 py-3.5 rounded-full text-slate-700 dark:text-white font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            whileHover={{ scale: 1.05, y: -3 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Learn More
                        </motion.a>
                    </motion.div>
                </motion.div>

                {/* Right Image/Mockup - GSAP parallax */}
                <div className="relative">
                    <motion.div
                        className="absolute -inset-10 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div ref={imageRef} className="glass-card p-2 overflow-hidden">
                        <img src="/images/img2.png" alt="CAD Platform Features" className="w-full rounded-2xl shadow-2xl" />
                    </div>
                </div>
            </div>
        </section>
    )
}
