import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);

  // Smart hide/show on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 100) {
        setIsHidden(true);
      } else if (currentY < lastScrollY.current) {
        setIsHidden(false);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#library', label: 'Library' },
    { href: '#features', label: 'Features' },
    { href: '#testimonials', label: 'Reviews' },
    { href: '#pricing', label: 'Pricing' },
  ];

  return (
    <header className='fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none pt-5'>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{
          y: isHidden ? -100 : 0,
          opacity: isHidden ? 0 : 1,
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className='pointer-events-auto'
      >
        <div className='navbar-glass flex items-center gap-2 px-4 py-2.5 rounded-full'>
          {/* Logo */}
          <Link
            to='/'
            className='flex items-center gap-2.5 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all duration-300'
          >
            <img
              src='/favicon.png'
              alt='ChainTorque Logo'
              className='w-8 h-8 object-contain shrink-0'
            />
            <span className='font-heading font-bold text-gradient hidden sm:inline whitespace-nowrap text-lg tracking-tight'>
              ChainTorque
            </span>
          </Link>

          {/* Divider */}
          <div className='bg-slate-200/50 dark:bg-white/10 hidden sm:block w-px h-5 mx-1' />

          {/* Nav Links — Desktop */}
          <div className='hidden md:flex items-center gap-0.5'>
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className='nav-link'>
                {link.label}
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className='bg-slate-200/50 dark:bg-white/10 hidden md:block w-px h-5 mx-1' />

          {/* Right Actions */}
          <div className='flex items-center gap-2'>
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleDarkMode}
              className='rounded-full flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shrink-0 w-9 h-9'
              whileTap={{ scale: 0.9, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <i
                className={`fas ${
                  darkMode ? 'fa-sun text-amber-400' : 'fa-moon text-slate-500'
                } text-sm`}
              />
            </motion.button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className='md:hidden rounded-full flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors w-9 h-9'
            >
              <i
                className={`fas ${mobileOpen ? 'fa-times' : 'fa-bars'} text-sm`}
                style={{ color: 'var(--text-secondary)' }}
              />
            </button>

            {/* Login Button */}
            <Link
              to='/sign-in'
              className='nav-cta flex items-center gap-2 shrink-0'
            >
              <span className='whitespace-nowrap'>Login</span>
              <i className='fas fa-arrow-right text-xs' />
            </Link>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className='md:hidden mt-2 navbar-glass rounded-2xl p-4 flex flex-col gap-1'
            >
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className='nav-link py-2.5 px-4 rounded-xl text-center'
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </header>
  );
}
