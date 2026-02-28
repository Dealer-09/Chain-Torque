export default function DetailedFeatures() {
    const detailedFeatures = [
        { icon: 'fa-cubes', title: 'Real-time 3D Previews', desc: 'Instantly visualize your CAD models online with zero lag.' },
        { icon: 'fa-lock', title: 'Secure Uploads', desc: 'Military-grade encryption for all your proprietary designs.' },
        { icon: 'fa-share-nodes', title: 'Easy Sharing', desc: 'Collaborate effortlessly with teammates across the globe.' },
    ]

    return (
        <section className="py-32 px-6 relative overflow-hidden" id="features">
            <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
                {/* Left Content */}
                <div className="reveal-left">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                        Tools for the <br /><span className="text-gradient">Next Generation</span>
                    </h2>

                    <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                        Whether you're a solo creator or a global enterprise, our platform scales with your ambition.
                    </p>

                    <div className="space-y-6">
                        {detailedFeatures.map((f) => (
                            <div key={f.title} className="flex gap-5 group">
                                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                    <i className={`fas ${f.icon} text-indigo-400`} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white mb-1">{f.title}</h4>
                                    <p className="text-sm text-slate-500">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 flex flex-wrap gap-4">
                        <a href="#" className="glass-button hover-lift">Start Free Trial</a>
                        <a
                            href="#"
                            className="px-8 py-3.5 rounded-full text-slate-700 dark:text-white font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            Learn More
                        </a>
                    </div>
                </div>

                {/* Right Image/Mockup */}
                <div className="reveal-right relative">
                    <div className="absolute -inset-10 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
                    <div className="glass-card p-2 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-700">
                        <img src="/images/img2.png" alt="CAD Platform Features" className="w-full rounded-2xl shadow-2xl" />
                    </div>
                </div>
            </div>
        </section>
    )
}
