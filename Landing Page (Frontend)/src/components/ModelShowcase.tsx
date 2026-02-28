export default function ModelShowcase() {
    return (
        <section className="py-32 px-6 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-20 items-center">
                    {/* Left - 3D Viewer */}
                    <div className="reveal-left">
                        <div className="relative">
                            <div
                                className="relative rounded-2xl overflow-hidden glass-card shadow-lg bg-slate-900/10"
                                style={{ aspectRatio: '16/10' }}
                            >
                                <iframe
                                    title="Engine"
                                    frameBorder="0"
                                    allowFullScreen
                                    allow="autoplay; fullscreen; xr-spatial-tracking"
                                    src="https://sketchfab.com/models/eea9d9252ab14298b50699a471dc2cee/embed?autospin=1&autostart=1&preload=1&transparent=1&ui_theme=dark"
                                    className="w-full h-full"
                                    style={{ minHeight: '400px' }}
                                />
                            </div>
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass-card rounded-full text-xs font-bold text-slate-500">
                                <i className="fas fa-mouse-pointer mr-2" />INTERACT IN 3D
                            </div>
                        </div>
                    </div>

                    {/* Right - Details */}
                    <div className="reveal-right">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                            </span>
                            Premium Experience
                        </div>

                        <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight text-slate-950 dark:text-white">
                            Visualize Excellence <br /><span className="text-gradient">In Full 3D</span>
                        </h2>

                        <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                            Don't just look at images. Inspect high-fidelity CAD models directly in your browser with our integrated
                            WebGL viewer.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-6 mb-10">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors group">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i className="fas fa-vr-cardboard text-indigo-400" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">360° Preview</h4>
                                <p className="text-xs text-slate-500">Inspect every angle and detail</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors group">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <i className="fas fa-shield-alt text-purple-400" />
                                </div>
                                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Blockchain Verification</h4>
                                <p className="text-xs text-slate-500">True ownership on-chain</p>
                            </div>
                        </div>

                        <a href="#" className="glass-button inline-flex items-center gap-3 hover-lift">
                            Join the Community
                            <i className="fas fa-arrow-right" />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    )
}
