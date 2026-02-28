import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'

export default function Hero() {
    const orbsRef = useRef<HTMLDivElement>(null)

    const scrollToLibrary = () => {
        document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })
    }

    // Floating orbs animation with GSAP
    useEffect(() => {
        if (!orbsRef.current) return
        const orbs = orbsRef.current.querySelectorAll('.hero-orb')
        orbs.forEach((orb, i) => {
            gsap.to(orb, {
                x: `random(-40, 40)`,
                y: `random(-40, 40)`,
                duration: 5 + i * 2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: i * 0.8,
            })
        })
    }, [])

    const containerVariants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.4,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
        },
    }

    return (
        <section className="min-h-screen flex flex-col items-center justify-center text-center relative overflow-hidden px-4 pt-28 pb-24">
            {/* Subtle background orbs — toned down */}
            <div ref={orbsRef} className="absolute inset-0 z-0 overflow-hidden">
                <div className="hero-orb w-[420px] h-[420px]" style={{ top: '-8%', left: '12%', background: 'rgba(13, 148, 136, 0.08)' }} />
                <div className="hero-orb w-[350px] h-[350px]" style={{ top: '25%', right: '8%', background: 'rgba(59, 110, 246, 0.06)' }} />
                <div className="hero-orb w-[300px] h-[300px]" style={{ bottom: '8%', left: '35%', background: 'rgba(212, 160, 83, 0.06)' }} />
            </div>

            {/* Dot grid pattern */}
            <div className="absolute inset-0 z-0 section-dot-grid opacity-20 dark:opacity-[0.04]" />

            {/* Content */}
            <motion.div
                className="relative z-10 max-w-4xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Badge */}
                <motion.div variants={itemVariants}>
                    <div className="hero-badge mb-8 mx-auto inline-flex">
                        <span className="dot" />
                        Next Gen CAD Marketplace
                    </div>
                </motion.div>

                {/* Heading — tighter, more professional */}
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl sm:text-6xl md:text-[5.5rem] font-heading font-bold mb-6 tracking-tight leading-[0.92]"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Build. Share.{' '}
                    <br />
                    <span className="text-gradient">Explore.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    variants={itemVariants}
                    className="text-base md:text-lg max-w-xl mx-auto mb-10 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    The community-driven Web3 marketplace where creativity meets
                    decentralized collaboration for CAD models.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div variants={itemVariants} className="flex flex-wrap gap-4 justify-center">
                    <Link to="/sign-up">
                        <motion.span
                            className="btn-primary"
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            Get Started Free
                            <i className="fas fa-arrow-right ml-1 text-sm" />
                        </motion.span>
                    </Link>
                    <motion.button
                        onClick={scrollToLibrary}
                        className="btn-secondary"
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                        Explore Models
                        <i className="fas fa-arrow-down ml-1 text-sm" />
                    </motion.button>
                </motion.div>

                {/* Trust bar — more substantial */}
                <motion.div
                    variants={itemVariants}
                    className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10"
                >
                    <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
                            <i className="fas fa-users text-xs" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <span className="text-sm font-medium">5,000+ Creators</span>
                    </div>
                    <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--card-border)' }} />
                    <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 110, 246, 0.1)' }}>
                            <i className="fas fa-cube text-xs" style={{ color: 'var(--accent-blue)' }} />
                        </div>
                        <span className="text-sm font-medium">12K+ Models</span>
                    </div>
                    <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--card-border)' }} />
                    <div className="flex items-center gap-2.5" style={{ color: 'var(--text-muted)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212, 160, 83, 0.1)' }}>
                            <i className="fas fa-shield-halved text-xs" style={{ color: 'var(--accent-secondary)' }} />
                        </div>
                        <span className="text-sm font-medium">Blockchain Secured</span>
                    </div>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <div
                className="absolute bottom-10 left-1/2 scroll-indicator cursor-pointer"
                onClick={scrollToLibrary}
            >
                <div className="w-7 h-11 rounded-full border-2 flex justify-center pt-2" style={{ borderColor: 'var(--card-border)' }}>
                    <motion.div
                        className="w-1 h-2 rounded-full"
                        style={{ background: 'var(--accent-primary)' }}
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
            </div>
        </section>
    )
}
