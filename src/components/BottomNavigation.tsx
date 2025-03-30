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
      icon: <Home className="w-6 h-6" />,
      showAlways: true,
    },
    {
      name: 'Mesocycle',
      href: '/mesocycle',
      icon: <Calendar className="w-6 h-6" />,
      showAlways: true,
    },
    {
      name: user ? 'Profile' : 'Login',
      href: user ? '/profile' : '/login',
      icon: user ? <User className="w-6 h-6" /> : <LogIn className="w-6 h-6" />,
      showAlways: true,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-0 w-full bg-black/95 border-t border-neon-green/20 z-50">
      <nav className="flex justify-around items-center h-16 px-4">
        {navItems.map((item) => {
          const isActive = 
            pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
            
          return (
            <Link 
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center transition-colors relative ${
                isActive 
                  ? 'text-neon-green' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                {item.icon}
                <span className="text-xs font-medium">{item.name}</span>
              </div>
              {isActive && (
                <div className="absolute -top-[1px] w-12 h-[2px] bg-neon-green" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 