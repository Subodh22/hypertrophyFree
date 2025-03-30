'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Dumbbell, User } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import Cookies from 'js-cookie';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Check for guest mode
  useEffect(() => {
    // Immediately check local storage for guest mode without waiting for cookies
    const localGuestMode = localStorage.getItem('guestMode') === 'true';
    if (localGuestMode) {
      setIsGuest(true);
    }
    
    // Then check cookies (might be slower)
    const cookieGuestMode = Cookies.get('guestMode') === 'true';
    if (cookieGuestMode) {
      setIsGuest(true);
    }
  }, []);
  
  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Mesocycles', href: '/mesocycle' },
  ];
  
  // Get the appropriate profile icon
  const getProfileIcon = () => {
    if (user?.photoURL) {
      return (
        <img 
          src={user.photoURL} 
          alt="Profile" 
          className="w-6 h-6 rounded-full object-cover"
        />
      );
    } else {
      return (
        <div className="w-6 h-6 rounded-full bg-neon-green/20 flex items-center justify-center">
          <User className="w-3 h-3 text-neon-green" />
        </div>
      );
    }
  };
  
  return (
    <header className="bg-black/80 backdrop-blur-md border-b border-neon-green/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-neon-green" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-neon-green">Hypertrophy</span>Pro
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
                
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'text-neon-green bg-neon-green/10' 
                      : 'text-gray-300 hover:text-white hover:bg-black/50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Profile Link (Desktop) */}
          <div className="hidden md:flex items-center">
            <Link
              href="/profile"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/profile' 
                  ? 'text-neon-green bg-neon-green/10' 
                  : 'text-gray-300 hover:text-white hover:bg-black/50'
              }`}
            >
              {getProfileIcon()}
              {isGuest ? 'Guest Profile' : 'Profile'}
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md bg-black/30 text-gray-400 hover:text-white hover:bg-black/50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-md border-b border-neon-green/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
                
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive 
                      ? 'text-neon-green bg-neon-green/10' 
                      : 'text-gray-300 hover:text-white hover:bg-black/50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
            
            {/* Profile Link (Mobile) */}
            <Link
              href="/profile"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium ${
                pathname === '/profile' 
                  ? 'text-neon-green bg-neon-green/10' 
                  : 'text-gray-300 hover:text-white hover:bg-black/50'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center">
                <User className="w-3 h-3 text-neon-green" />
              </div>
              {isGuest ? 'Guest Profile' : 'Profile'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
} 