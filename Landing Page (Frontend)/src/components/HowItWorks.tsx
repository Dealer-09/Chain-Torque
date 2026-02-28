import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function HowItWorks() {
    const steps = [
        { id: '01', title: 'Sign Up', desc: 'Create your unique profile', icon: 'fa-user-plus' },
        { id: '02', title: 'Connect', desc: 'Link your Web3 wallet', icon: 'fa-wallet' },
        { id: '03', title: 'Browse', desc: 'Explore the marketplace', icon: 'fa-compass' },
        { id: '04', title: 'Upload', desc: 'Mint your 3D models', icon: 'fa-cloud-arrow-up' },
        { id: '05', title: 'Trade', desc: 'Collaborate and earn', icon: 'fa-handshake' },
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
        <section ref={sectionRef} className="py-28 md:py-36 px-6 relative" style={{ background: 'var(--bg-secondary)' }}>
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
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
                                    whileHover={{ scale: 1.1, borderColor: 'var(--accent-cyan)' }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                >
                                    <span className="text-lg font-heading font-bold text-gradient">{step.id}</span>
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
