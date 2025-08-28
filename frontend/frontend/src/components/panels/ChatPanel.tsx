import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'system' | 'game';
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'System',
      message: 'Welcome to PV3 Mines! Good luck!',
      timestamp: new Date(),
      type: 'system'
    },
    {
      id: '2',
      username: 'Player1',
      message: 'Let\'s go! Ready for some action',
      timestamp: new Date(),
      type: 'chat'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        username: 'You',
        message: newMessage.trim(),
        timestamp: new Date(),
        type: 'chat'
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'system':
        return 'text-yellow-400 italic';
      case 'game':
        return 'text-blue-400';
      default:
        return 'text-text-primary';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-bold text-text-primary font-audiowide mb-4">💬 Live Chat</h3>
      
      {/* Messages Area */}
      <div className="flex-1 bg-bg-card rounded-lg p-3 overflow-y-auto mb-4 min-h-[250px]">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="group">
              <div className="flex items-start gap-2">
                <span className="text-xs text-text-secondary mt-1">
                  {formatTime(msg.timestamp)}
                </span>
                <div className="flex-1">
                  <span className="font-semibold text-accent-primary text-sm">
                    {msg.username}:
                  </span>
                  <span className={`ml-2 text-sm ${getMessageStyle(msg.type)}`}>
                    {msg.message}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-bg-main border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-primary"
          maxLength={200}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="px-4 py-2 bg-accent-primary hover:bg-accent-secondary disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
        >
          Send
        </button>
      </form>

      {/* Chat Info */}
      <div className="mt-2 text-xs text-text-secondary">
        <p>• Be respectful to other players</p>
        <p>• No spam or inappropriate content</p>
      </div>
    </div>
  );
} 