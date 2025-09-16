'use client';

import DeveloperExperience from '@/components/DeveloperExperience';

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="container-width py-8">
        {/* Page Header */}
        <div className="mb-12">
          <h1 
            className="text-4xl lg:text-5xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: '#01d3f4'
            }}
          >
            Developer Experience
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Built by developers, for developers. Experience the most powerful Solana RPC infrastructure with tools that just work.
          </p>
        </div>
      </div>
      
      <DeveloperExperience />
    </div>
  );
}