import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function DetailedFeatures() {
    const detailedFeatures = [
        { icon: 'fa-cubes', title: 'Real-time 3D Previews', desc: 'Instantly visualize your CAD models online with zero lag.', color: 'var(--accent-primary)' },
        { icon: 'fa-lock', title: 'Secure Uploads', desc: 'Military-grade encryption for all your proprietary designs.', color: 'var(--accent-blue)' },
        { icon: 'fa-share-nodes', title: 'Easy Sharing', desc: 'Collaborate effortlessly with teammates across the globe.', color: 'var(--accent-secondary)' },
    ]

    const imageRef = useRef<HTMLDivElement>(null)
    const sectionRef = useRef<HTMLElement>(null)

    // Parallax on the image
    useEffect(() => {
        if (!imageRef.current || !sectionRef.current) return

        gsap.fromTo(
            imageRef.current,
            { y: 40, rotate: 2 },
            {
                y: -30,
                rotate: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.2,
                },
            }
        )
    }, [])

    const listVariants = {
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    }

    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
    }

    return (
        <section ref={sectionRef} className="py-28 md:py-36 px-6 relative overflow-hidden" id="features">
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 lg:gap-20 items-center">
                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--accent-primary)' }}>
                        Platform Tools
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight" style={{ color: 'var(--text-primary)' }}>
                        Tools for the <br /><span className="text-gradient">Next Generation</span>
                    </h2>

                    <p className="text-base md:text-lg mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Whether you're a solo creator or a global enterprise, our platform scales with your ambition.
                    </p>

                    <motion.div
                        className="space-y-3"
                        variants={listVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-60px' }}
                    >
                        {detailedFeatures.map((f) => (
                            <motion.div key={f.title} variants={itemVariants}
                                className="card-bordered flex items-start gap-4 group"
                                style={{ borderLeftColor: f.color }}
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                                    style={{ background: `${f.color}15` }}>
                                    <i className={`fas ${f.icon}`} style={{ color: f.color }} />
                                </div>
                                <div>
                                    <h4 className="font-heading font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h4>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="mt-10 flex flex-wrap gap-3">
                        <Link to="/sign-up">
                            <motion.span
                                className="btn-primary"
                                whileHover={{ scale: 1.04, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                Start Free Trial
                            </motion.span>
                        </Link>
                        <motion.a
                            href="#"
                            className="btn-secondary"
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Learn More
                        </motion.a>
                    </div>
                </motion.div>

                {/* Right Image/Mockup */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                    className="relative"
                >
                    <div ref={imageRef} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-lg)' }}>
                        <img src="/images/img2.png" alt="CAD Platform Features" className="w-full" />
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
