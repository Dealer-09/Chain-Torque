import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function HowItWorks() {
    const steps = [
        { id: '01', title: 'Sign Up', desc: 'Create your unique profile', icon: 'fa-user-plus', color: 'var(--accent-primary)' },
        { id: '02', title: 'Connect', desc: 'Link your Web3 wallet', icon: 'fa-wallet', color: 'var(--accent-blue)' },
        { id: '03', title: 'Browse', desc: 'Explore the marketplace', icon: 'fa-compass', color: 'var(--accent-purple)' },
        { id: '04', title: 'Upload', desc: 'Mint your 3D models', icon: 'fa-cloud-arrow-up', color: 'var(--accent-secondary)' },
        { id: '05', title: 'Trade', desc: 'Collaborate and earn', icon: 'fa-handshake', color: 'var(--accent-primary)' },
    ]

    const lineRef = useRef<HTMLDivElement>(null)
    const sectionRef = useRef<HTMLElement>(null)

    // GSAP scroll-driven line fill
    useEffect(() => {
        if (!lineRef.current || !sectionRef.current) return

        gsap.fromTo(
            lineRef.current,
            { width: '0%' },
            {
                width: '100%',
                ease: 'none',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top 60%',
                    end: 'bottom 60%',
                    scrub: 0.5,
                },
            }
        )
    }, [])

    return (
        <section ref={sectionRef} className="py-28 md:py-36 px-6 relative section-warm">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
                        Getting Started
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Your Journey <span className="text-gradient">Starts Here</span>
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        Five simple steps to master the future of CAD.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Timeline line — Desktop only */}
                    <div className="hidden md:block timeline-line">
                        <div className="absolute inset-0 h-full w-full rounded-full" style={{ background: 'var(--card-border)' }} />
                        <div ref={lineRef} className="timeline-line-fill relative z-[1]" />
                    </div>

                    <div className="grid md:grid-cols-5 gap-10 md:gap-6" id="journey-steps">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                className="relative z-10 text-center"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-40px' }}
                                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <motion.div
                                    className="step-circle mx-auto"
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                >
                                    <i className={`fas ${step.icon} text-lg`} style={{ color: step.color }} />
                                </motion.div>
                                <h3 className="font-heading font-semibold text-base mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                    {step.title}
                                </h3>
                                <p className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>
                                    {step.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
