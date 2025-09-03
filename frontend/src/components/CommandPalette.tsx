'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Home, 
  FileText, 
  BarChart3, 
  Zap,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  const commands: CommandItem[] = [
    {
      id: 'home',
      label: 'Go to Home',
      description: 'Navigate to the homepage',
      icon: <Home className="w-4 h-4" />,
      action: () => {
        window.location.href = '/';
        onClose();
      },
      keywords: ['home', 'dashboard', 'main']
    },
    {
      id: 'performance',
      label: 'View Performance',
      description: 'Check RPC performance metrics',
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => {
        document.getElementById('performance')?.scrollIntoView({ behavior: 'smooth' });
        onClose();
      },
      keywords: ['performance', 'metrics', 'stats', 'speed']
    },
    {
      id: 'pricing',
      label: 'View Pricing',
      description: 'Check pricing plans',
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => {
        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
        onClose();
      },
      keywords: ['pricing', 'plans', 'cost', 'billing']
    },
    {
      id: 'docs',
      label: 'Documentation',
      description: 'View API documentation',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        window.open('/docs', '_blank');
        onClose();
      },
      keywords: ['docs', 'documentation', 'api', 'guide']
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Go to your dashboard',
      icon: <Activity className="w-4 h-4" />,
      action: () => {
        window.location.href = '/dashboard';
        onClose();
      },
      keywords: ['dashboard', 'control', 'panel']
    },
    {
      id: 'status',
      label: 'System Status',
      description: 'Check system status',
      icon: <Zap className="w-4 h-4" />,
      action: () => {
        window.open('https://status.n0de.com', '_blank');
        onClose();
      },
      keywords: ['status', 'uptime', 'health', 'system']
    }
  ];

  // Close on Escape
  useHotkeys('escape', () => {
    if (isOpen) onClose();
  });

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Command Palette */}
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-2xl"
            >
              <Command className="rounded-2xl border border-border bg-bg-card/95 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center border-b border-border px-4">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-text-muted" />
                  <Command.Input
                    placeholder="Type a command or search..."
                    value={search}
                    onValueChange={setSearch}
                    className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <Command.List className="max-h-80 overflow-y-auto p-2">
                  <Command.Empty className="py-6 text-center text-sm text-text-muted">
                    No results found.
                  </Command.Empty>

                  <Command.Group heading="Navigation">
                    {commands.map((command) => (
                      <Command.Item
                        key={command.id}
                        value={`${command.label} ${command.description} ${command.keywords?.join(' ')}`}
                        onSelect={command.action}
                        className="relative flex cursor-pointer select-none items-center rounded-lg px-3 py-3 text-sm outline-none hover:bg-bg-hover data-[selected]:bg-bg-hover"
                      >
                        <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-bg-elevated text-text-accent">
                          {command.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">
                            {command.label}
                          </span>
                          {command.description && (
                            <span className="text-xs text-text-muted">
                              {command.description}
                            </span>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>

                <div className="border-t border-border px-4 py-2">
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-bg-elevated px-1.5 font-mono text-[10px] font-medium text-text-secondary opacity-100">
                          ↵
                        </kbd>
                        <span>to select</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-bg-elevated px-1.5 font-mono text-[10px] font-medium text-text-secondary opacity-100">
                          esc
                        </kbd>
                        <span>to close</span>
                      </span>
                    </div>
                  </div>
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}