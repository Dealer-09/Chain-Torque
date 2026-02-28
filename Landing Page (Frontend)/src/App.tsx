import { useState, useEffect } from 'react'
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
import { useScrollReveal } from './hooks/useScrollReveal'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Detect production vs development for marketplace URL
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

function App() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark'
        }
        return false
    })

    // Initialize scroll reveal animations
    useScrollReveal()

    // Check for Clerk auth and redirect logged-in users to marketplace
    useEffect(() => {
        if (!CLERK_PUBLISHABLE_KEY) return

        // Load Clerk and check auth for any authenticated user on the landing page
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js'
        script.async = true
        script.crossOrigin = 'anonymous'
        script.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY)

        script.onload = async () => {
            if (window.Clerk) {
                await window.Clerk.load({
                    allowedRedirectOrigins: [MARKETPLACE_URL, window.location.origin],
                })
                // If user is logged in, redirect to marketplace
                if (window.Clerk.user) {
                    window.location.href = MARKETPLACE_URL
                }
            }
        }

        document.head.appendChild(script)
    }, [])

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

    return (
        <div className="min-h-screen transition-colors duration-300">
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
    )
}

export default App
