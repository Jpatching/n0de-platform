'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  X, 
  Minimize2, 
  Maximize2,

  Clock,
  CheckCircle,
  AlertCircle,

  Plus,
  Search,

  FileText,

  Settings,
  CircleHelp,
  CreditCard,
  Key,
  BarChart3,
  DollarSign
} from 'lucide-react';
import api from '@/lib/api';


interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'bot';
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'feature_request' | 'bug_report';
  created: Date;
  updated: Date;
  assignedTo?: string;
  messages: Message[];
  tags: string[];
  satisfaction?: number;
}

interface SupportSystemProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'chat' | 'tickets' | 'help';
}

export default function SupportSystem({ isOpen, onClose, mode = 'chat' }: SupportSystemProps) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
                content: 'Hello! How can I help you with your N0DE RPC infrastructure today?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      type: 'text',
      status: 'read'
    }
  ]);

  const [tickets] = useState<Ticket[]>([
    {
      id: 'T-001',
      title: 'High Latency on Frankfurt Nodes',
      description: 'Experiencing increased latency (>50ms) on Frankfurt region nodes since yesterday.',
      status: 'in_progress',
      priority: 'high',
      category: 'technical',
      created: new Date(Date.now() - 24 * 60 * 60 * 1000),
      updated: new Date(Date.now() - 2 * 60 * 60 * 1000),
      assignedTo: 'Jordan Chen',
      messages: [],
      tags: ['latency', 'frankfurt', 'performance']
    },
    {
      id: 'T-002',
      title: 'API Key Not Working',
      description: 'My production API key is returning 401 errors for all requests.',
      status: 'resolved',
      priority: 'urgent',
      category: 'technical',
      created: new Date(Date.now() - 48 * 60 * 60 * 1000),
      updated: new Date(Date.now() - 1 * 60 * 60 * 1000),
      assignedTo: 'Riley Morgan',
      messages: [],
      tags: ['api-key', 'authentication', 'production'],
      satisfaction: 5
    },
    {
      id: 'T-003',
      title: 'Billing Question - Enterprise Plan',
      description: 'Need clarification on enterprise plan pricing for dedicated nodes.',
      status: 'waiting',
      priority: 'medium',
      category: 'billing',
      created: new Date(Date.now() - 12 * 60 * 60 * 1000),
      updated: new Date(Date.now() - 1 * 60 * 60 * 1000),
      messages: [],
      tags: ['billing', 'enterprise', 'pricing']
    }
  ]);

  const categories = [
    { id: 'all', label: 'All Categories', icon: FileText },
    { id: 'technical', label: 'Technical', icon: Settings },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'general', label: 'General', icon: MessageSquare },
    { id: 'feature_request', label: 'Feature Request', icon: Plus },
    { id: 'bug_report', label: 'Bug Report', icon: AlertCircle }
  ];

  const priorityColors = {
    low: 'text-blue-400 bg-blue-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    urgent: 'text-red-400 bg-red-400/10'
  };

  const statusColors = {
    open: 'text-blue-400 bg-blue-400/10',
    in_progress: 'text-yellow-400 bg-yellow-400/10',
    waiting: 'text-purple-400 bg-purple-400/10',
    resolved: 'text-green-400 bg-green-400/10',
    closed: 'text-gray-400 bg-gray-400/10'
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Thank you for your message! I\'m looking into this for you. Our average response time is under 2 minutes.',
        sender: 'agent',
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      };
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
    }, 2000);
  };

  const createTicket = () => {
    // This would open a ticket creation modal
    console.log('Creating new ticket...');
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = (ticket?.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         (ticket?.description || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ticket?.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-4 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            height: isMinimized ? '60px' : '600px',
            width: isMinimized ? '300px' : '400px'
          }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-bg-elevated border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-n0de-green to-n0de-blue p-4 text-black">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">N0DE Support</h3>
                  <p className="text-xs opacity-80">
                    {currentMode === 'chat' ? 'Live Chat' : 
                     currentMode === 'tickets' ? 'Support Tickets' : 'Help Center'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-black/10 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Mode Tabs */}
              <div className="flex border-b border-border">
                {[
                  { id: 'chat', label: 'Live Chat', icon: MessageSquare },
                  { id: 'tickets', label: 'Tickets', icon: FileText },
                  { id: 'help', label: 'Help', icon: CircleHelp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentMode(tab.id as 'chat' | 'tickets' | 'help')}
                    className={`flex-1 flex items-center justify-center space-x-2 p-3 text-sm font-medium transition-colors ${
                      currentMode === tab.id
                        ? 'text-n0de-green border-b-2 border-n0de-green bg-n0de-green/5'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Chat Mode */}
              {currentMode === 'chat' && (
                <div className="flex flex-col h-96">
                  {/* Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.sender === 'user'
                              ? 'bg-n0de-green text-black'
                              : 'bg-bg-card text-text-primary'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                            <span>{msg.timestamp.toLocaleTimeString()}</span>
                            {msg.sender === 'user' && (
                              <div className="flex items-center space-x-1">
                                {msg.status === 'sending' && <Clock className="w-3 h-3" />}
                                {msg.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-bg-card text-text-primary p-3 rounded-lg">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-n0de-green rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-n0de-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-n0de-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 hover:bg-bg-hover rounded-lg transition-colors">
                        <Paperclip className="w-4 h-4 text-text-secondary" />
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type your message..."
                          className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-n0de-green"
                        />
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className="p-2 bg-n0de-green text-black rounded-lg hover:bg-n0de-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tickets Mode */}
              {currentMode === 'tickets' && (
                <div className="h-96 flex flex-col">
                  {/* Tickets Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-text-primary">Support Tickets</h4>
                      <button
                        onClick={createTicket}
                        className="flex items-center space-x-1 px-3 py-1 bg-n0de-green text-black text-sm rounded-lg hover:bg-n0de-green/90 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New</span>
                      </button>
                    </div>
                    
                    {/* Search and Filter */}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search tickets..."
                          className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-n0de-green"
                        />
                      </div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-n0de-green"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tickets List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border border-border rounded-lg p-3 hover:border-n0de-green/50 transition-colors cursor-pointer"
                        onClick={() => {}}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-medium text-text-primary text-sm mb-1">{ticket.title}</h5>
                            <p className="text-text-secondary text-xs line-clamp-2">{ticket.description}</p>
                          </div>
                          <div className="flex flex-col items-end space-y-1 ml-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-text-muted">
                          <span>#{ticket.id}</span>
                          <span>{ticket.updated.toLocaleDateString()}</span>
                        </div>
                        
                        {ticket.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ticket.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-bg-hover text-text-secondary rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help Mode */}
              {currentMode === 'help' && (
                <div className="h-96 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h4 className="font-semibold text-text-primary mb-2">How can we help?</h4>
                      <p className="text-text-secondary text-sm">Find answers to common questions</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: Key, label: 'API Keys', desc: 'Manage API access' },
                        { icon: Settings, label: 'Configuration', desc: 'Setup guides' },
                        { icon: BarChart3, label: 'Performance', desc: 'Optimize speed' },
                        { icon: DollarSign, label: 'Billing', desc: 'Pricing & plans' }
                      ].map((item) => (
                        <button
                          key={item.label}
                          className="p-3 bg-bg-card border border-border rounded-lg hover:border-n0de-green/50 transition-colors text-left"
                        >
                          <item.icon className="w-5 h-5 text-n0de-green mb-2" />
                          <h5 className="font-medium text-text-primary text-sm">{item.label}</h5>
                          <p className="text-text-secondary text-xs">{item.desc}</p>
                        </button>
                      ))}
                    </div>

                    {/* Popular Articles */}
                    <div>
                      <h5 className="font-medium text-text-primary mb-3">Popular Articles</h5>
                      <div className="space-y-2">
                        {[
                          'Getting Started with n0de RPC',
                          'API Rate Limits and Best Practices',
                          'Troubleshooting Connection Issues',
                          'Understanding Latency Metrics',
                          'Billing and Usage Monitoring'
                        ].map((article) => (
                          <button
                            key={article}
                            className="w-full text-left p-2 hover:bg-bg-hover rounded-lg transition-colors"
                          >
                            <span className="text-sm text-text-primary">{article}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}