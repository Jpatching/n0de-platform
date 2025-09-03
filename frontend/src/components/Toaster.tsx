'use client';

import { Toaster as Sonner } from 'sonner';

export default function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(17, 17, 17, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
        },
        className: 'my-toast',
      }}
      theme="dark"
      richColors
      expand
      visibleToasts={5}
      closeButton
    />
  );
}

// Toast utility functions
export { toast } from 'sonner';