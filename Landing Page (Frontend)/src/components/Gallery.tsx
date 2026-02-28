import { motion } from 'framer-motion'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
}

const imageVariants = {
    hidden: { opacity: 0, scale: 0.85, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
        },
    },
}

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
            <motion.div
                className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"
                animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute top-1/2 right-0 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"
                animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="max-w-7xl mx-auto relative z-10">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Masterpieces of <span className="text-gradient">Design</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                        Experience the pinnacle of engineering creativity from our global community of makers.
                    </p>
                </motion.div>

                <motion.div
                    className="columns-1 sm:columns-2 md:columns-4 gap-6 space-y-6"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-50px' }}
                >
                    {images.map((img, index) => (
                        <motion.div
                            key={index}
                            className="gallery-card glass-card overflow-hidden"
                            variants={imageVariants}
                            whileHover={{
                                y: -5,
                                scale: 1.02,
                                transition: { duration: 0.3 },
                            }}
                        >
                            <motion.img
                                src={img}
                                alt={`CAD Model ${index + 1}`}
                                className="w-full h-auto object-cover"
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
