export default function Collections() {
    const collections = [
        {
            title: 'Mechanical Parts',
            desc: 'Precision-engineered gears, joints, and industrial components.',
            icon: 'fa-cog',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            linkColor: 'text-blue-400',
        },
        {
            title: 'Architectural',
            desc: 'Stunning 3D building models, urban layouts, and interiors.',
            icon: 'fa-building',
            iconBg: 'bg-purple-500/20',
            iconColor: 'text-purple-400',
            linkColor: 'text-purple-400',
        },
        {
            title: '3D Printables',
            desc: 'Optimized, manifold models ready for immediate 3D printing.',
            icon: 'fa-print',
            iconBg: 'bg-pink-500/20',
            iconColor: 'text-pink-400',
            linkColor: 'text-pink-400',
        },
    ]

    return (
        <section className="py-32 px-6 relative" id="library">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Curated <span className="text-gradient">Collections</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Explore the finest 3D models hand-picked by our curators for quality and precision.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {collections.map((collection) => (
                        <div key={collection.title} className="card-modern glass-card reveal hover-lift">
                            <div className={`card-icon ${collection.iconBg} ${collection.iconColor}`}>
                                <i className={`fas ${collection.icon}`} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{collection.title}</h3>
                            <p className="text-slate-400 mb-6">{collection.desc}</p>
                            <a href="#" className={`${collection.linkColor} font-bold flex items-center gap-2 hover:gap-3 transition-all`}>
                                View Collection <i className="fas fa-chevron-right text-xs" />
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
