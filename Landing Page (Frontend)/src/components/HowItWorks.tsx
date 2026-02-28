import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function HowItWorks() {
    const steps = [
        { id: '01', title: 'Sign Up', desc: 'Create your unique profile' },
        { id: '02', title: 'Connect', desc: 'Link your Web3 wallet' },
        { id: '03', title: 'Browse', desc: 'Explore the marketplace' },
        { id: '04', title: 'Upload', desc: 'Mint your 3D models' },
        { id: '05', title: 'Trade', desc: 'Collaborate and earn' },
    ]

    const lineRef = useRef<HTMLDivElement>(null)
    const sectionRef = useRef<HTMLElement>(null)

    useEffect(() => {
        if (lineRef.current && sectionRef.current) {
            gsap.fromTo(lineRef.current,
                { scaleX: 0 },
                {
                    scaleX: 1,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top 60%',
                        end: 'center center',
                        scrub: 1,
                    }
                }
            )
        }
    }, [])

    const stepVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.8 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                delay: i * 0.12,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
            },
        }),
    }

    return (
        <section ref={sectionRef} className="py-32 px-6 bg-slate-50 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-20"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Your Journey <span className="text-gradient">Starts Here</span>
                    </h2>
                    <p className="text-xl text-slate-400">Five simple steps to master the future of CAD.</p>
                </motion.div>

                <div className="relative">
                    {/* Connecting Line (Desktop) - GSAP animated */}
                    <div
                        ref={lineRef}
                        className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2 step-line"
                        style={{ transformOrigin: 'left', scaleX: 0 }}
                    />

                    <div className="grid md:grid-cols-5 gap-8" id="journey-steps">
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                className="relative z-10 text-center"
                                custom={index}
                                variants={stepVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                            >
                                <motion.div
                                    className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500/50 flex items-center justify-center mx-auto mb-6 transition-colors shadow-xl shadow-indigo-500/20"
                                    whileHover={{
                                        scale: 1.15,
                                        boxShadow: '0 0 30px rgba(79, 70, 229, 0.4)',
                                        borderColor: 'rgba(79, 70, 229, 0.9)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                >
                                    <span className="text-xl font-black text-gradient">{step.id}</span>
                                </motion.div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-500 px-4">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
