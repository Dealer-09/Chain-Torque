import { motion } from 'framer-motion'

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

const cardVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.7,
            ease: [0.16, 1, 0.3, 1],
        },
    },
}

export default function Pricing() {
    return (
        <section className="py-32 px-6 relative" id="pricing">
            <div className="section-divider mb-20" />

            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Scalable <span className="text-gradient">Pricing</span>
                    </h2>
                    <p className="text-xl text-slate-400">Simple, transparent plans for everyone from hobbyists to enterprises.</p>
                </motion.div>

                <motion.div
                    className="grid md:grid-cols-3 gap-8 items-stretch"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                >
                    {/* Starter Plan */}
                    <motion.div
                        className="card-modern glass-card flex flex-col hover:border-emerald-500/30 transition-colors"
                        variants={cardVariants}
                        whileHover={{
                            y: -10,
                            scale: 1.02,
                            rotateY: -2,
                            transition: { duration: 0.3, ease: 'easeOut' },
                        }}
                        style={{ transformPerspective: 800 }}
                    >
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Starter</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">Free</div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            {['Basic CAD uploads', '1GB Cloud Storage', 'Public Collections'].map((item, i) => (
                                <motion.li
                                    key={item}
                                    className="flex items-center gap-3 text-slate-400 text-sm"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                                    viewport={{ once: true }}
                                >
                                    <i className="fas fa-check text-emerald-400" /> {item}
                                </motion.li>
                            ))}
                        </ul>
                        <motion.button
                            className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-900 dark:text-white"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Get Started
                        </motion.button>
                    </motion.div>

                    {/* Pro Plan */}
                    <motion.div
                        className="card-modern glass-card flex flex-col relative overflow-hidden border-indigo-500/50 pricing-popular-glow gradient-border scale-105 z-10"
                        variants={cardVariants}
                        whileHover={{
                            y: -12,
                            scale: 1.08,
                            transition: { duration: 0.3, ease: 'easeOut' },
                        }}
                    >
                        <motion.div
                            className="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white rounded-bl-xl"
                            initial={{ x: 50, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                            viewport={{ once: true }}
                        >
                            Popular
                        </motion.div>
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Professional</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">
                            $29<span className="text-lg font-medium text-slate-500">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            {['Everything in Starter', '50GB Cloud Storage', 'Private Collections', 'Priority Rendering'].map((item, i) => (
                                <motion.li
                                    key={item}
                                    className="flex items-center gap-3 text-slate-400 text-sm"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                                    viewport={{ once: true }}
                                >
                                    <i className="fas fa-check text-indigo-400" /> {item}
                                </motion.li>
                            ))}
                        </ul>
                        <motion.button
                            className="w-full glass-button justify-center"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Start Free Trial
                        </motion.button>
                    </motion.div>

                    {/* Enterprise Plan */}
                    <motion.div
                        className="card-modern glass-card flex flex-col hover:border-emerald-500/30 transition-colors"
                        variants={cardVariants}
                        whileHover={{
                            y: -10,
                            scale: 1.02,
                            rotateY: 2,
                            transition: { duration: 0.3, ease: 'easeOut' },
                        }}
                        style={{ transformPerspective: 800 }}
                    >
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Enterprise</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">Custom</div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            {['Everything in Pro', 'Unlimited Storage', 'Dedicated Support', 'API Access'].map((item, i) => (
                                <motion.li
                                    key={item}
                                    className="flex items-center gap-3 text-slate-400 text-sm"
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                                    viewport={{ once: true }}
                                >
                                    <i className="fas fa-check text-emerald-400" /> {item}
                                </motion.li>
                            ))}
                        </ul>
                        <motion.button
                            className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-900 dark:text-white"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            Contact Sales
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
