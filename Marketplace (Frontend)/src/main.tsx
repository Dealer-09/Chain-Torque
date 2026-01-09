import './silence-warnings'; // Must be first
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress some development warnings in development mode
if (import.meta.env.DEV) {
  // Filter out noisy development warnings
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('React Router Future Flag Warning') ||
      message.includes('development keys') ||
      message.includes('should not be used when deploying')
    ) {
      return; // Suppress these specific warnings
    }
    originalWarn(...args);
  };
}

createRoot(document.getElementById('root')!).render(<App />);
