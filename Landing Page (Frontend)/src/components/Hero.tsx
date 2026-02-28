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
                x: `random(-60, 60)`,
                y: `random(-60, 60)`,
                duration: 4 + i * 1.5,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: i * 0.5,
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
            {/* Animated Background Orbs */}
            <div ref={orbsRef} className="absolute inset-0 z-0 overflow-hidden">
                <div className="hero-orb bg-cyan-400/15 dark:bg-cyan-400/10 w-[500px] h-[500px]" style={{ top: '-10%', left: '10%' }} />
                <div className="hero-orb bg-blue-500/10 dark:bg-blue-500/8 w-[400px] h-[400px]" style={{ top: '20%', right: '5%' }} />
                <div className="hero-orb bg-purple-500/8 dark:bg-purple-500/6 w-[350px] h-[350px]" style={{ bottom: '5%', left: '30%' }} />
            </div>

            {/* Dot grid pattern */}
            <div className="absolute inset-0 z-0 section-dot-grid opacity-30 dark:opacity-10" />

            {/* Content */}
            <motion.div
                className="relative z-10 max-w-5xl mx-auto"
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

                {/* Heading */}
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl sm:text-6xl md:text-8xl font-heading font-bold mb-8 tracking-tight leading-[0.95]"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Build. Share.{' '}
                    <br />
                    <span className="text-gradient">Explore.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    variants={itemVariants}
                    className="text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Experience the future of CAD modeling on Web3. A community-driven marketplace where creativity meets
                    decentralized collaboration.
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
                            <i className="fas fa-rocket ml-1" />
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

                {/* Trust bar */}
                <motion.div
                    variants={itemVariants}
                    className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <div className="flex items-center gap-2">
                        <i className="fas fa-users text-cyan-400" />
                        <span>5,000+ Creators</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-cube text-blue-400" />
                        <span>12K+ Models</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-shield-halved text-emerald-400" />
                        <span>Blockchain Secured</span>
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
                        style={{ background: 'var(--accent-cyan)' }}
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </div>
            </div>
        </section>
    )
}
