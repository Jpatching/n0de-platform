'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, Mail, User, MessageSquare, Send } from 'lucide-react';
import { GlassCard } from './GlassmorphismCard';
import { toast } from './Toaster';

// Form schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  company: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ModernFormProps {
  onSubmit?: (data: ContactFormData) => Promise<void>;
  className?: string;
}

export default function ModernForm({ onSubmit, className }: ModernFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const handleFormSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        // Default submission logic
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
        console.log('Form submitted:', data);
      }
      
      toast.success('Message sent successfully!');
      reset();
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard className={className}>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold gradient-text">Get in Touch</h3>
          <p className="text-text-secondary">
            Ready to supercharge your Solana infrastructure? Let&apos;s talk.
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                {...register('name')}
                placeholder="Your Name"
                className="w-full pl-10 pr-4 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 placeholder:text-white/60 text-white focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-transparent transition-all duration-300"
                disabled={isSubmitting}
              />
            </div>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm"
              >
                {errors.name.message}
              </motion.p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                {...register('email')}
                type="email"
                placeholder="your@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 placeholder:text-white/60 text-white focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-transparent transition-all duration-300"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm"
              >
                {errors.email.message}
              </motion.p>
            )}
          </div>

          {/* Company Field */}
          <div className="space-y-2">
            <input
              {...register('company')}
              placeholder="Company (Optional)"
              className="w-full px-4 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 placeholder:text-white/60 text-white focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-transparent transition-all duration-300"
              disabled={isSubmitting}
            />
          </div>

          {/* Message Field */}
          <div className="space-y-2">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-white/60" />
              <textarea
                {...register('message')}
                placeholder="Tell us about your project..."
                rows={4}
                className="w-full pl-10 pr-4 py-3 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 placeholder:text-white/60 text-white focus:outline-none focus:ring-2 focus:ring-n0de-green/50 focus:border-transparent transition-all duration-300 resize-none"
                disabled={isSubmitting}
              />
            </div>
            {errors.message && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm"
              >
                {errors.message.message}
              </motion.p>
            )}
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isSubmitting}
            whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            className="w-full relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-r from-n0de-green to-n0de-blue px-6 py-3 font-semibold text-black transition-all duration-300 hover:shadow-lg hover:shadow-n0de-green/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-center space-x-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
            </div>
          </motion.button>
        </form>

        <div className="text-center text-xs text-white/60">
          We&apos;ll get back to you within 24 hours
        </div>
      </div>
    </GlassCard>
  );
}