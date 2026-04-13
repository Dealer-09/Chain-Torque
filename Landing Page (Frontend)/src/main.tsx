import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import AuthPage from './pages/AuthPage'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const AppRoutes = () => (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/sign-in/*" element={<AuthPage type="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage type="sign-up" />} />
            {/* Legacy routes for compatibility */}
            <Route path="/login/*" element={<AuthPage type="sign-in" />} />
            <Route path="/signup/*" element={<AuthPage type="sign-up" />} />
        </Routes>
    </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {PUBLISHABLE_KEY ? (
            <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
                <AppRoutes />
            </ClerkProvider>
        ) : (
            <AppRoutes />
        )}
    </React.StrictMode>,
)
