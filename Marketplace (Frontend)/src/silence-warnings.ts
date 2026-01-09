// This file is imported first in main.tsx to suppress warnings before other modules load

if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        const message = args.map(arg => String(arg)).join(' ');

        // Filter out Clerk and other noisy warnings
        if (
            message.includes('React Router Future Flag Warning') ||
            message.includes('development keys') ||
            message.includes('should not be used when deploying') ||
            message.includes('Clerk: Clerk has been loaded')
        ) {
            return;
        }

        originalWarn(...args);
    };
}
