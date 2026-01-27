// Shared URL utilities for consistent production/development detection

// Backend URLs for fallback support
const PRIMARY_BACKEND_URL = 'https://chaintorque-backend.onrender.com';
const FALLBACK_BACKEND_URL = 'https://chain-torque-backend.onrender.com';

// Track active backend URL (exported for fallback switching)
export let activeBackendUrl: string | null = null;

/**
 * Switch to fallback backend URL
 */
export const switchToFallbackBackend = () => {
    if (activeBackendUrl !== FALLBACK_BACKEND_URL) {
        console.log('🔄 Switching to fallback backend:', FALLBACK_BACKEND_URL);
        activeBackendUrl = FALLBACK_BACKEND_URL;
    }
};

/**
 * Get the backend API base URL based on current environment
 */
export const getBackendUrl = (): string => {
    // If we've already determined a working URL, use it
    if (activeBackendUrl) return activeBackendUrl;

    // 1. Environment variable takes priority
    if (import.meta.env.VITE_API_URL) {
        // Remove /api suffix if present for base URL
        return import.meta.env.VITE_API_URL.replace(/\/api$/, '');
    }
    // 2. Detect localhost
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5001';
    }
    // 3. Production Render backend (primary)
    return PRIMARY_BACKEND_URL;
};

/**
 * Get the CAD editor URL based on current environment
 */
export const getCadUrl = (): string => {
    if (import.meta.env.VITE_CAD_URL) {
        return import.meta.env.VITE_CAD_URL;
    }
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:3001';
    }
    return 'https://chaintorque-cad.onrender.com';
};

/**
 * Get the landing page URL based on current environment
 */
export const getLandingUrl = (): string => {
    if (import.meta.env.VITE_LANDING_URL) {
        return import.meta.env.VITE_LANDING_URL;
    }
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:5000';
    }
    return 'https://chaintorque-landing.onrender.com';
};

/**
 * Get the marketplace URL based on current environment
 */
export const getMarketplaceUrl = (): string => {
    if (import.meta.env.VITE_MARKETPLACE_URL) {
        return import.meta.env.VITE_MARKETPLACE_URL;
    }
    if (typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8080';
    }
    return 'https://chaintorque-marketplace.onrender.com';
};

/**
 * Helper to resolve image/model URLs from backend
 */
export const resolveAssetUrl = (url: string | undefined): string => {
    if (!url) return '/placeholder.png';
    if (url.startsWith('http') || url.startsWith('ipfs://')) return url;
    return `${getBackendUrl()}${url}`;
};
