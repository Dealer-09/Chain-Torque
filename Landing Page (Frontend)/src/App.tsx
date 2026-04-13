import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { AnimatePresence } from 'framer-motion'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Header from './components/Header'
import Hero from './components/Hero'
import ModelShowcase from './components/ModelShowcase'
import Collections from './components/Collections'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Gallery from './components/Gallery'
import Testimonials from './components/Testimonials'
import DetailedFeatures from './components/DetailedFeatures'
import Pricing from './components/Pricing'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'

gsap.registerPlugin(ScrollTrigger)

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const getMarketplaceUrl = () => {
    if (import.meta.env.VITE_MARKETPLACE_URL) {
        return import.meta.env.VITE_MARKETPLACE_URL;
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8080';
    }
    return 'https://chaintorque-marketplace.onrender.com';
};
const MARKETPLACE_URL = getMarketplaceUrl();

// Home Page Component
function HomePage({ darkMode, toggleDarkMode }: { darkMode: boolean; toggleDarkMode: () => void }) {
    const lenisRef = useRef<Lenis | null>(null)

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        })
        lenisRef.current = lenis

        // Sync Lenis with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add((time) => {
            lenis.raf(time * 1000)
        })
        gsap.ticker.lagSmoothing(0)

        return () => {
            lenis.destroy()
            gsap.ticker.remove(lenis.raf as any)
        }
    }, [])

    const { isLoaded, isSignedIn } = useUser()

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            window.location.href = MARKETPLACE_URL
        }
    }, [isLoaded, isSignedIn])

    return (
        <AnimatePresence mode="wait">
            <div className="min-h-screen transition-colors duration-500">
                <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                <main>
                    <Hero />
                    <ModelShowcase />
                    <Collections />
                    <Features />
                    <HowItWorks />
                    <Gallery />
                    <Testimonials />
                    <DetailedFeatures />
                    <Pricing />
                </main>
                <Footer />
                <BackToTop />
            </div>
        </AnimatePresence>
    )
}

function App() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark')
            document.body.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            document.body.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }, [darkMode])

    const toggleDarkMode = () => setDarkMode(!darkMode)

    return <HomePage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
}

export default App

