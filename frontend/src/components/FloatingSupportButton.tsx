'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Mail, Phone } from 'lucide-react';

interface FloatingSupportButtonProps {
  onSupportClick: () => void;
}

export default function FloatingSupportButton({ onSupportClick }: FloatingSupportButtonProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);

  const quickActions = [
    {
      icon: MessageSquare,
      label: 'Live Chat',
      description: 'Chat with our team',
      action: onSupportClick,
      color: 'from-n0de-green to-n0de-blue'
    },
    {
      icon: Mail,
      label: 'Email Support',
      description: 'support@N0DE.com',
      action: () => window.open('mailto:support@N0DE.com'),
      color: 'from-n0de-blue to-n0de-purple'
    },
    {
      icon: Phone,
      label: 'Enterprise',
      description: 'Schedule a call',
      action: () => window.open('https://calendly.com/N0DE-enterprise'),
      color: 'from-n0de-purple to-n0de-green'
    }
  ];

  return (
    <>
      {/* Quick Actions Menu */}
      <AnimatePresence>
        {showQuickActions && (
          <div className="fixed bottom-24 right-6 z-40">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="space-y-3"
            >
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    action.action();
                    setShowQuickActions(false);
                  }}
                  className={`flex items-center space-x-3 bg-gradient-to-r ${action.color} text-black px-4 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all group min-w-48`}
                >
                  <action.icon className="w-5 h-5" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">{action.label}</div>
                    <div className="text-xs opacity-80">{action.description}</div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Support Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowQuickActions(!showQuickActions)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-n0de-green to-n0de-blue text-black rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center ${
          showQuickActions ? 'rotate-45' : ''
        }`}
      >
        {showQuickActions ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </motion.button>

      {/* Notification Badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-16 right-16 z-40 w-4 h-4 bg-red-500 rounded-full border-2 border-bg-main"
      >
        <div className="w-full h-full bg-red-500 rounded-full animate-ping" />
      </motion.div>
    </>
  );
}