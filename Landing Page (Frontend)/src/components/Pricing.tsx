export default function Pricing() {
    return (
        <section className="py-32 px-6 relative" id="pricing">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Scalable <span className="text-gradient">Pricing</span>
                    </h2>
                    <p className="text-xl text-slate-400">Simple, transparent plans for everyone from hobbyists to enterprises.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-stretch">
                    {/* Starter Plan */}
                    <div className="card-modern glass-card reveal hover-lift flex flex-col">
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Starter</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">Free</div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> Basic CAD uploads
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> 1GB Cloud Storage
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> Public Collections
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-900 dark:text-white">
                            Get Started
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="card-modern glass-card reveal hover-lift flex flex-col relative overflow-hidden border-indigo-500/50 shadow-2xl shadow-indigo-500/20 scale-105 z-10">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500 text-[10px] font-black uppercase tracking-widest text-white rounded-bl-xl">
                            Popular
                        </div>
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Professional</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">
                            $29<span className="text-lg font-medium text-slate-500">/mo</span>
                        </div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-indigo-400" /> Everything in Starter
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-indigo-400" /> 50GB Cloud Storage
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-indigo-400" /> Private Collections
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-indigo-400" /> Priority Rendering
                            </li>
                        </ul>
                        <button className="w-full glass-button hover-lift">Start Free Trial</button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="card-modern glass-card reveal hover-lift flex flex-col">
                        <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Enterprise</h4>
                        <div className="text-4xl font-black mb-6 text-slate-900 dark:text-white">Custom</div>
                        <ul className="space-y-4 mb-8 flex-grow">
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> Everything in Pro
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> Unlimited Storage
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> Dedicated Support
                            </li>
                            <li className="flex items-center gap-3 text-slate-400 text-sm">
                                <i className="fas fa-check text-emerald-400" /> API Access
                            </li>
                        </ul>
                        <button className="w-full py-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-bold text-slate-900 dark:text-white">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
