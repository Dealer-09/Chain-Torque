import { Link } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import './AuthPage.css'

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

const clerkAppearance = {
    baseTheme: undefined, // baseTheme requires @clerk/themes to be installed, leaving it managed by variables
    variables: {
        colorPrimary: '#6366f1',
        colorBackground: 'transparent',
        colorInputBackground: 'rgba(255, 255, 255, 0.05)',
        colorInputText: '#f1f5f9',
        colorText: '#e5e7eb',
        colorTextSecondary: '#94a3b8',
        borderRadius: '12px',
    },
    elements: {
        rootBox: 'w-full',
        card: 'bg-transparent shadow-none border-none',
        formButtonPrimary:
            'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700',
    },
}

interface AuthPageProps {
    type: 'sign-in' | 'sign-up'
}

export default function AuthPage({ type }: AuthPageProps) {
    const error = !CLERK_PUBLISHABLE_KEY ? 'VITE_CLERK_PUBLISHABLE_KEY is not configured' : null;

    return (
        <div className="auth-page">
            {/* 3D Grid Background */}
            <div className="grid-bg" />

            {/* Gradient Overlay */}
            <div className="gradient-overlay" />

            {/* Floating Shapes */}
            <div className="floating-shape shape-1" />
            <div className="floating-shape shape-2" />
            <div className="floating-shape shape-3" />
            <div className="floating-shape shape-4" />
            <div className="floating-shape shape-5" />

            {/* Glowing Orbs */}
            <div className="glow-orb orb-1" />
            <div className="glow-orb orb-2" />
            <div className="glow-orb orb-3" />

            {/* Auth Container */}
            <div className="auth-container">
                <div className="auth-card">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <img src="/favicon.png" alt="ChainTorque" className="w-20 h-20 object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            {type === 'sign-in' ? 'Welcome Back' : 'Join ChainTorque'}
                        </h1>
                        <p className="text-gray-400">
                            {type === 'sign-in' ? 'Sign in to ChainTorque' : 'Create your account'}
                        </p>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="text-center mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <p className="text-red-400 text-sm">{error}</p>
                            <p className="text-gray-400 text-xs mt-2">
                                Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file
                            </p>
                        </div>
                    )}

                    {/* Clerk Component Mount Point */}
                    {!error && (
                        <div className="flex justify-center">
                            {type === 'sign-in' ? (
                                <SignIn
                                    appearance={clerkAppearance}
                                    forceRedirectUrl={MARKETPLACE_URL}
                                    fallbackRedirectUrl={MARKETPLACE_URL}
                                />
                            ) : (
                                <SignUp
                                    appearance={clerkAppearance}
                                    forceRedirectUrl={MARKETPLACE_URL}
                                    fallbackRedirectUrl={MARKETPLACE_URL}
                                />
                            )}
                        </div>
                    )}

                    {/* Footer Link */}
                    <div className="text-center mt-6">
                        {type === 'sign-in' ? (
                            <Link to="/sign-up" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                Don't have an account? <span className="font-semibold">Sign up</span>
                            </Link>
                        ) : (
                            <Link to="/sign-in" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                                Already have an account? <span className="font-semibold">Sign in</span>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
