'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, User, LogIn, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

export default function BottomNavigation() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  
  const navItems = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: <Home className="w-5 h-5" />,
      showAlways: true,
    },
    {
      name: 'Mesocycle',
      href: '/mesocycle',
      icon: <Calendar className="w-5 h-5" />,
      showAlways: true,
    },
    {
      name: user ? 'Profile' : 'Login',
      href: user ? '/profile' : '/login',
      icon: user ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />,
      showAlways: true,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-md border-t border-neon-green/20 z-50">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = 
            pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
            
          return (
            <Link 
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive 
                  ? 'text-neon-green' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex flex-col items-center">
                {item.icon}
                <span className="text-xs mt-1">{item.name}</span>
              </div>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-neon-green rounded-b-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 