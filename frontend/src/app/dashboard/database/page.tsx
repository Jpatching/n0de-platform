'use client';

import AppLayout from '@/components/layouts/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { Database, Plus, Search, Filter } from 'lucide-react';

const DatabasePage = () => {
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
                <h1 className="text-2xl font-bold text-white mb-2">Database</h1>
                <p className="text-zinc-400">
                  Manage your data collections and queries.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search collections..."
                    className="pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <button className="flex items-center space-x-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
                  <Plus className="h-4 w-4" />
                  <span>New Collection</span>
                </button>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-12 text-center"
          >
            <Database className="h-16 w-16 text-zinc-600 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">No Collections Found</h3>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Create your first data collection to start storing and managing your application data 
              with our powerful NoSQL database.
            </p>
            <button className="px-6 py-3 bg-cyan-500 text-black rounded-lg hover:bg-cyan-400 transition-colors font-medium">
              Create First Collection
            </button>
          </motion.div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default DatabasePage;