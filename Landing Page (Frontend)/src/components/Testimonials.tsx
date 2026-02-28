import { Star } from 'lucide-react'

const reviews = [
    {
        name: 'Arjun Mehta',
        role: 'Mechanical Engineer',
        img: '/images/user1.jpg',
        text: 'ChainTorque has completely redefined my workflow. The integration of 3D previews with blockchain ownership is a game-changer.',
    },
    {
        name: 'Rhea Das',
        role: '3D Model Artist',
        img: '/images/user2.jpg',
        text: 'Finally, a platform that respects creators. The UI is gorgeous, and the community is incredibly supportive and professional.',
    },
    {
        name: 'Imran Shaikh',
        role: 'Product Designer',
        img: '/images/user3.jpg',
        text: "The speed and security of this platform are unmatched. It's the only marketplace I trust for my high-fidelity CAD assets.",
    },
]

export default function Testimonials() {
    return (
        <section className="py-32 px-6 relative" id="testimonials">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 reveal">
                    <h2 className="text-4xl md:text-5xl font-black mb-6">
                        Voices of the <span className="text-gradient">Future</span>
                    </h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400">
                        Join thousands of creators who've already switched to ChainTorque.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {reviews.map((review, index) => (
                        <div
                            key={review.name}
                            className="card-modern glass-card reveal hover-lift"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <img
                                    src={review.img}
                                    alt={review.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500/30"
                                />
                                <div>
                                    <h4 className="font-bold">{review.name}</h4>
                                    <p className="text-xs text-indigo-400 font-bold tracking-wider uppercase">{review.role}</p>
                                </div>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 italic leading-relaxed">"{review.text}"</p>
                            <div className="mt-6 flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
