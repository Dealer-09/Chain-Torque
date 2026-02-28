export default function Gallery() {
    const images = [
        '/images/cad1.jpeg',
        '/images/cad2.jpeg',
        '/images/cad3.jpeg',
        '/images/cad4.jpeg',
    ]

    return (
        <section className="py-32 px-6 relative overflow-hidden">
            {/* Decorative blurred blobs */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Masterpieces of <span className="text-gradient">Design</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Experience the pinnacle of engineering creativity from our global community of makers.
                    </p>
                </div>

                <div className="columns-1 sm:columns-2 md:columns-4 gap-6 space-y-6">
                    {images.map((img, index) => (
                        <div key={index} className="gallery-card glass-card overflow-hidden reveal hover-lift">
                            <img
                                src={img}
                                alt={`CAD Model ${index + 1}`}
                                className="w-full h-auto object-cover hover:scale-110 transition-transform duration-700"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
