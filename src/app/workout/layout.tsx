'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function WorkoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
} 