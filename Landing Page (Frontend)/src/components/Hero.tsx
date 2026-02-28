import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
        },
    },
}

const floatingOrbs = [
    { size: 300, color: 'rgba(79, 70, 229, 0.15)', top: '10%', left: '5%', delay: 0 },
    { size: 200, color: 'rgba(124, 58, 237, 0.12)', top: '60%', right: '10%', delay: 2 },
    { size: 150, color: 'rgba(236, 72, 153, 0.1)', bottom: '15%', left: '20%', delay: 4 },
    { size: 100, color: 'rgba(79, 70, 229, 0.08)', top: '30%', right: '25%', delay: 1 },
]

export default function Hero() {
    const headingRef = useRef<HTMLHeadingElement>(null)

    const scrollToLibrary = () => {
        document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (headingRef.current) {
            // GSAP text animation - animate each word
            const words = headingRef.current.querySelectorAll('.hero-word')
            gsap.fromTo(words,
                { opacity: 0, y: 60, rotateX: -40 },
                {
                    opacity: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 1,
                    ease: 'power3.out',
                    stagger: 0.12,
                    delay: 0.3,
                }
            )
        }
    }, [])

    return (
        <section className="min-h-screen flex flex-col items-center justify-center text-center relative overflow-hidden px-4 pt-24 pb-20">
            {/* Animated Mesh Background */}
            <div className="absolute inset-0 z-0">
                <div className="hero-mesh" />
            </div>

            {/* Animated Floating Orbs */}
            {floatingOrbs.map((orb, i) => (
                <motion.div
                    key={i}
                    className="floating-orb"
                    style={{
                        width: orb.size,
                        height: orb.size,
                        background: orb.color,
                        top: orb.top,
                        left: orb.left,
                        right: (orb as any).right,
                        bottom: (orb as any).bottom,
                    }}
                    animate={{
                        x: [0, 30, -20, 0],
                        y: [0, -20, 30, 0],
                        scale: [1, 1.1, 0.9, 1],
                    }}
                    transition={{
                        duration: 12 + i * 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: orb.delay,
                    }}
                />
            ))}

            {/* Geometric Shapes with GSAP-enhanced float */}
            <motion.div 
                className="geo-shape hexagon" 
                style={{ top: '15%', left: '10%' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div 
                className="geo-shape circle-outline" 
                style={{ top: '25%', right: '15%' }}
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div 
                className="geo-shape hexagon" 
                style={{ bottom: '20%', right: '10%' }}
                animate={{ rotate: -360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div 
                className="geo-shape circle-outline" 
                style={{ bottom: '30%', left: '15%' }}
                animate={{ rotate: 360, scale: [1, 0.8, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Content */}
            <motion.div
                className="relative z-10 max-w-5xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.div
                    className="inline-block px-4 py-1.5 mb-6 rounded-full border border-slate-200 dark:border-white/20 bg-slate-100/80 dark:bg-white/5"
                    variants={itemVariants}
                >
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-white/80">
                        ✨ Next Gen CAD Marketplace
                    </span>
                </motion.div>

                <h1 
                    ref={headingRef}
                    className="text-6xl md:text-8xl font-black mb-8 hero-title tracking-tighter leading-none text-slate-950 dark:text-white"
                    style={{ perspective: '500px' }}
                >
                    <span className="hero-word inline-block" style={{ opacity: 0 }}>Build.</span>{' '}
                    <span className="hero-word inline-block" style={{ opacity: 0 }}>Share.</span>{' '}
                    <br />
                    <span className="hero-word inline-block text-gradient" style={{ opacity: 0 }}>Explore.</span>
                </h1>

                <motion.p
                    className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto mb-12 font-medium"
                    variants={itemVariants}
                >
                    Experience the future of CAD modeling on Web3. A community-driven marketplace where creativity meets
                    decentralized collaboration.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    className="flex flex-wrap gap-6 justify-center"
                    variants={itemVariants}
                >
                    <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
                        <Link to="/sign-up" className="glass-button hover-lift">
                            Get Started Free
                            <i className="fas fa-rocket ml-2" />
                        </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
                        <button
                            onClick={scrollToLibrary}
                            className="px-8 py-3.5 rounded-full text-slate-700 dark:text-white font-semibold border border-slate-200 dark:border-white/10 backdrop-blur-md bg-white/5 hover:bg-white/10 transition-all duration-300"
                        >
                            Explore Models
                        </button>
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 cursor-pointer"
                onClick={scrollToLibrary}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.8 }}
            >
                <motion.div
                    className="w-8 h-12 rounded-full border-2 border-slate-300 dark:border-white/20 flex justify-center p-2"
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <motion.div
                        className="w-1 h-2 bg-slate-400 dark:bg-white/60 rounded-full"
                        animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                </motion.div>
            </motion.div>
        </section>
    )
}
