import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpDown } from 'lucide-react';
import { BridgeModal } from './BridgeModal';
import { useToast } from '@/hooks/use-toast';

interface BridgeButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  onBridgeComplete?: (amount: string) => void;
}

export function BridgeButton({ 
  variant = 'default', 
  size = 'default', 
  className = '',
  onBridgeComplete 
}: BridgeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleBridgeSuccess = (amount: string) => {
    setIsModalOpen(false);
    onBridgeComplete?.(amount);
    
    toast({
      title: 'Deposit Complete! 🎉',
      description: `${amount} SOL ready for gaming`,
    });
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={`${className} relative overflow-hidden group`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4" />
          <span>Deposit Any Crypto</span>
        </div>
        
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Button>

      <BridgeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBridgeSuccess}
      />
    </>
  );
} 