export default function HowItWorks() {
    const steps = [
        { id: '01', title: 'Sign Up', desc: 'Create your unique profile' },
        { id: '02', title: 'Connect', desc: 'Link your Web3 wallet' },
        { id: '03', title: 'Browse', desc: 'Explore the marketplace' },
        { id: '04', title: 'Upload', desc: 'Mint your 3D models' },
        { id: '05', title: 'Trade', desc: 'Collaborate and earn' },
    ]

    return (
        <section className="py-32 px-6 bg-slate-50 dark:bg-slate-900/20 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Your Journey <span className="text-gradient">Starts Here</span>
                    </h2>
                    <p className="text-xl text-slate-400">Five simple steps to master the future of CAD.</p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent -translate-y-1/2" />

                    <div className="grid md:grid-cols-5 gap-8" id="journey-steps">
                        {steps.map((step) => (
                            <div key={step.id} className="relative z-10 text-center">
                                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500/50 flex items-center justify-center mx-auto mb-6 transition-colors shadow-xl shadow-indigo-500/20">
                                    <span className="text-xl font-black text-gradient">{step.id}</span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{step.title}</h3>
                                <p className="text-sm text-slate-500 px-4">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
