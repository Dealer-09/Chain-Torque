import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface HeaderProps {
    darkMode: boolean
    toggleDarkMode: () => void
}

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
    const [isShrinked, setIsShrinked] = useState(false)
    const [lastScrollY, setLastScrollY] = useState(0)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                // Scrolling down
                setIsShrinked(true)
            } else if (currentScrollY < lastScrollY) {
                // Scrolling up
                setIsShrinked(false)
            }
            setLastScrollY(currentScrollY)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

    return (
        <>
            {/* Unique Floating Pill Navigation */}
            <nav className={`fixed left-1/2 transform -translate-x-1/2 z-50 transition-all duration-1000 ease-in-out origin-top ${isShrinked ? 'top-0 scale-0 opacity-0 pointer-events-none' : 'top-4 scale-100 opacity-100'}`}>
                <div className="navbar-pill flex items-center gap-2 px-3 py-2 rounded-full">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all duration-300">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-sm">CT</span>
                        </div>
                        <span className="font-bold text-gradient hidden sm:inline whitespace-nowrap text-lg">
                            ChainTorque
                        </span>
                    </Link>

                    {/* Divider */}
                    <div className="bg-slate-200 dark:bg-white/20 hidden sm:block w-px h-6 mx-1" />

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center">
                        <a href="#library" className="nav-pill-link px-4 py-1.5 rounded-full text-sm font-medium section-subtitle hover:bg-white/10 hover:text-white transition-all duration-300 whitespace-nowrap">
                            Library
                        </a>
                        <a href="#features" className="nav-pill-link px-4 py-1.5 rounded-full text-sm font-medium section-subtitle hover:bg-white/10 hover:text-white transition-all duration-300 whitespace-nowrap">
                            Features
                        </a>
                        <a href="#testimonials" className="nav-pill-link px-4 py-1.5 rounded-full text-sm font-medium section-subtitle hover:bg-white/10 hover:text-white transition-all duration-300 whitespace-nowrap">
                            Reviews
                        </a>
                    </div>

                    {/* Divider */}
                    <div className="bg-slate-200 dark:bg-white/20 hidden md:block w-px h-6 mx-1" />

                    {/* Right Actions */}
                    <div className="flex items-center gap-1.5">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all duration-300 group shrink-0 w-9 h-9"
                        >
                            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'} text-slate-600 dark:text-slate-400 group-hover:text-amber-500 transition-colors text-sm`} />
                        </button>

                        {/* Login Button */}
                        <Link
                            to="/sign-in"
                            className="nav-login-btn flex items-center rounded-full font-semibold text-white transition-all duration-500 shrink-0 px-4 py-1.5 text-sm gap-2"
                        >
                            <span className="whitespace-nowrap">Login</span>
                            <i className="fas fa-arrow-right text-xs" />
                        </Link>
                    </div>
                </div>
            </nav>
        </>
    )
}
