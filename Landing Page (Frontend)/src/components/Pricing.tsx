import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function Pricing() {
    const navigate = useNavigate()
    const plans = [
        {
            name: 'Starter',
            price: 'Free',
            isFeatured: false,
            features: ['Basic CAD uploads', '1GB Cloud Storage', 'Public Collections'],
            cta: 'Get Started',
        },
        {
            name: 'Professional',
            price: '$29',
            period: '/mo',
            isFeatured: true,
            features: ['Everything in Starter', '50GB Cloud Storage', 'Private Collections', 'Priority Rendering'],
            cta: 'Start Free Trial',
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            isFeatured: false,
            features: ['Everything in Pro', 'Unlimited Storage', 'Dedicated Support', 'API Access'],
            cta: 'Contact Sales',
        },
    ]

    return (
        <section className="py-28 md:py-36 px-6 relative section-warm" id="pricing">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-primary)' }}>
                        Pricing
                    </p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Scalable <span className="text-gradient">Plans</span>
                    </h2>
                    <p className="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
                        Simple, transparent pricing for everyone — from hobbyists to enterprises.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6 items-stretch">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            className={`card flex flex-col relative ${plan.isFeatured ? 'pricing-card-featured md:scale-[1.03] z-10' : ''}`}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-60px' }}
                            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6 }}
                        >
                            {plan.isFeatured && (
                                <div className="pricing-badge">Most Popular</div>
                            )}

                            <h4 className="text-sm font-heading font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                                {plan.name}
                            </h4>
                            <div className="text-4xl font-heading font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                                {plan.price}
                                {plan.period && <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>}
                            </div>

                            <ul className="space-y-3.5 mb-8 flex-grow">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <i className="fas fa-check text-xs" style={{ color: 'var(--accent-primary)' }} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <motion.button
                                onClick={() => {
                                    if (plan.cta === 'Start Free Trial') {
                                        navigate('/sign-up')
                                    }
                                }}
                                className={`w-full py-3.5 rounded-xl font-heading font-semibold text-sm transition-colors ${
                                    plan.isFeatured
                                        ? 'btn-primary justify-center'
                                        : ''
                                }`}
                                style={!plan.isFeatured ? {
                                    border: '1.5px solid var(--card-border-hover)',
                                    color: 'var(--text-primary)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                } : {}}
                                whileHover={!plan.isFeatured ? { borderColor: 'var(--accent-primary)' } : {}}
                                whileTap={{ scale: 0.98 }}
                            >
                                {plan.cta}
                            </motion.button>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
