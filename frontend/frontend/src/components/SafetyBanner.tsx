'use client';

export default function SafetyBanner() {
  const safetyMessages = [
    "🛡️ Your funds are secured with military-grade encryption and multi-signature wallets",
    "🔒 All games use provably fair algorithms verified by blockchain technology", 
    "⚖️ Play responsibly - Set limits and never gamble more than you can afford to lose",
    "🏦 Session vaults keep your funds safe with instant withdrawals and 2FA protection",
    "🔍 Full transparency - All transactions and results are publicly verifiable on Solana",
    "📱 24/7 customer support available for any security or safety concerns",
    "🎯 Licensed and regulated gaming platform committed to player protection",
    "💡 Take breaks, stay in control, and remember gaming should always be fun",
    "🔐 Advanced anti-cheat systems ensure fair play for all participants",
    "⏰ Automatic session timeouts and spending limits help maintain healthy gaming habits"
  ];

  return (
    <div className="mt-8 mb-6">
      <div className="h-12 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20 rounded-lg overflow-hidden relative">
        {/* Moving banner background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
        
        {/* Safety indicator */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 z-20">
          <div 
            className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
            style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)' }}
          ></div>
          <span className="text-green-400 font-audiowide text-xs font-bold">SAFE GAMING</span>
        </div>
        
        {/* Scrolling text container */}
        <div className="flex items-center h-full pl-40">
          <div className="animate-scroll-safety whitespace-nowrap font-audiowide font-bold text-sm">
            {safetyMessages.map((message, index) => (
              <span 
                key={index} 
                className="inline-block mr-24 text-green-400"
                style={{
                  textShadow: '0 0 4px rgba(34, 197, 94, 0.3)'
                }}
              >
                {message}
              </span>
            ))}
            {/* Repeat for seamless loop */}
            {safetyMessages.map((message, index) => (
              <span 
                key={`repeat-${index}`} 
                className="inline-block mr-24 text-green-400"
                style={{
                  textShadow: '0 0 4px rgba(34, 197, 94, 0.3)'
                }}
              >
                {message}
              </span>
            ))}
          </div>
        </div>

        {/* Gradient fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg-primary to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-primary to-transparent pointer-events-none"></div>

        <style jsx>{`
          @keyframes scroll-safety {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
          
          .animate-scroll-safety {
            animation: scroll-safety 180s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
} 