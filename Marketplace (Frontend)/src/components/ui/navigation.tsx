import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { User, LogOut, Activity, ChevronUp } from 'lucide-react';
import { useAuthContext } from '@/hooks/useAuth';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useStatusPanel } from '@/contexts/StatusPanelContext';
import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAuthenticated, signOut } = useAuthContext();
  const { getOverallStatus } = useSystemStatus();
  const { toggleStatusPanel } = useStatusPanel();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollButton(window.scrollY > 300);
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getStatusColor = () => {
    const overallStatus = getOverallStatus();
    switch (overallStatus) {
      case 'healthy':
        return 'text-emerald-500';
      case 'partial':
        return 'text-amber-500';
      case 'checking':
        return 'text-amber-500 animate-pulse';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/edit', label: 'Edit' },
    { path: '/upload', label: 'Upload' },
    { path: '/chat', label: 'Chat' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'glass shadow-[var(--shadow-card)]'
          : 'bg-background/60 backdrop-blur-sm'
          }`}
      >
        <div className='container mx-auto px-6 h-16 flex items-center justify-between'>
          {/* Logo */}
          <Link
            to='/'
            className='text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
          >
            ChainTorque
          </Link>

          {/* Navigation Links */}
          <ul className='hidden md:flex items-center gap-1'>
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Section */}
          <div className='flex items-center gap-2'>
            {/* Status Indicator */}
            <button
              onClick={toggleStatusPanel}
              className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors'
              title='System status'
            >
              <Activity className={`h-3.5 w-3.5 ${getStatusColor()}`} />
            </button>

            <ThemeToggle />

            {isAuthenticated && user && (
              <div className='flex items-center gap-2 ml-2'>
                <div className='hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50'>
                  <User className='h-3.5 w-3.5 text-muted-foreground' />
                  <span className='text-sm font-medium text-foreground'>
                    {user.firstName}
                  </span>
                </div>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleLogout}
                  className='h-8 px-3 text-muted-foreground hover:text-foreground'
                >
                  <LogOut className='h-3.5 w-3.5' />
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className='h-16' />

      {/* Scroll To Top Button */}
      <button
        className={`fixed bottom-6 right-6 p-3 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${showScrollButton
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        onClick={scrollToTop}
        aria-label='Scroll to top'
      >
        <ChevronUp className='h-5 w-5' />
      </button>
    </>
  );
}
