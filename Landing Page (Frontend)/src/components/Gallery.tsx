import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Gallery() {
    const images = [
        '/images/cad1.jpeg',
        '/images/cad2.jpeg',
        '/images/cad3.jpeg',
        '/images/cad4.jpeg',
    ]

    const containerRef = useRef<HTMLDivElement>(null)

    // Subtle parallax on gallery images
    useEffect(() => {
        if (!containerRef.current) return
        const items = containerRef.current.querySelectorAll('.gallery-item')
        items.forEach((item, i) => {
            gsap.fromTo(
                item,
                { y: 20 + i * 10 },
                {
                    y: -(10 + i * 8),
                    ease: 'none',
                    scrollTrigger: {
                        trigger: item,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1.2,
                    },
                }
            )
        })
    }, [])

    return (
        <section className="py-28 md:py-36 px-6 relative overflow-hidden">
            {/* Decorative blurred blobs */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(0, 212, 255, 0.06)' }} />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(139, 92, 246, 0.06)' }} />

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Masterpieces of <span className="text-gradient">Design</span>
                    </h2>
                    <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        Experience the pinnacle of engineering creativity from our global community of makers.
                    </p>
                </motion.div>

                <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {images.map((img, index) => (
                        <motion.div
                            key={index}
                            className="gallery-item card overflow-hidden !p-0 group"
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="overflow-hidden relative aspect-[4/3] w-full">
                                <img
                                    src={img}
                                    alt={`CAD Model ${index + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                />
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end">
                                    <div className="p-5 text-white w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <p className="text-base font-heading font-semibold">CAD Model #{index + 1}</p>
                                        <p className="text-sm opacity-80 mt-1">Community Showcase</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
