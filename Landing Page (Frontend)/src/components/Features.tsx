export default function Features() {
    const features = [
        {
            title: 'Instant Access',
            icon: 'fa-bolt',
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/10',
            desc: 'Upload and visualize your CAD models in seconds with our optimized pipeline.',
        },
        {
            title: 'On-Chain Security',
            icon: 'fa-shield-halved',
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10',
            desc: 'Your intellectual property is protected by blockchain-backed ownership verification.',
        },
        {
            title: 'Intuitive UX',
            icon: 'fa-compass',
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            desc: 'A seamless interface designed specifically for engineers and 3D artists.',
        },
    ]

    return (
        <section className="px-6 py-32 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Engineered for <span className="text-gradient">Innovators</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Our platform combines cutting-edge Web3 technology with an intuitive design experience.
                    </p>
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature, index) => (
                        <div
                            key={feature.title}
                            className="card-modern glass-card reveal hover-lift group"
                            data-delay={index * 100}
                        >
                            <div
                                className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                            >
                                <i className={`fas ${feature.icon} ${feature.color} text-2xl`} />
                            </div>
                            <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
