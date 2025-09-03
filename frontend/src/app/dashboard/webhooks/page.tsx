'use client';

import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { Webhook, Plus } from 'lucide-react';

const WebhooksPage = () => {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-full bg-black p-6">
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Webhooks</h1>
                <p className="text-zinc-400">
                  Configure webhooks to receive real-time notifications.
                </p>
              </div>
              <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
                <Plus className="h-4 w-4" />
                <span>Add Webhook</span>
              </button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-12 text-center"
          >
            <Webhook className="h-16 w-16 text-zinc-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">No Webhooks Configured</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Set up webhooks to receive real-time notifications about API events, 
              user actions, and system updates.
            </p>
            <button className="px-6 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
              Create Your First Webhook
            </button>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default WebhooksPage;