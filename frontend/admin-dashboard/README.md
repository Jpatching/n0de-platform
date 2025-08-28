# PV3 Admin Dashboard

A comprehensive administrative interface for managing the PV3 Web3 gaming platform. This dashboard provides real-time monitoring, user management, financial controls, security oversight, and system administration capabilities.

## 🚀 Features

### 🎮 Game Ecosystem Management
- **Real-time Active Matches**: Monitor all ongoing games across platforms
- **Game Performance Analytics**: Track win rates, player engagement, revenue per game
- **Game Parameter Control**: Adjust game mechanics, difficulty, and settings
- **Unity Game Monitoring**: Specialized monitoring for Unity-based games
- **Developer Game Management**: Control which games are accessible to users

### 💰 Financial Control Center
- **Real-time Revenue Dashboard**: Live platform revenue and transaction tracking
- **Session Vault Management**: Monitor user wallets and emergency controls
- **Cross-Chain Bridge Monitoring**: Track Wormhole/Jupiter transactions
- **Emergency Financial Controls**: Manual payouts, dispute resolution, refunds
- **Fee Management**: Dynamic platform and referral fee adjustments

### 🔒 Security & User Management
- **Real-time Threat Detection**: Advanced anti-cheat and fraud monitoring
- **User Management Hub**: Comprehensive user profiles and administrative actions
- **2FA & Authentication Management**: Security settings and verification status
- **Ed25519 Signature Verification**: Cryptographic security monitoring

### 🤖 AI & Machine Learning
- **Bot Intelligence Center**: Monitor and optimize 5 bot personalities
- **Predictive Analytics Engine**: User behavior and platform forecasting
- **Fraud Detection AI**: Advanced pattern recognition and anomaly detection

### 🌐 Multi-Chain Expansion
- **Bridge Operations Center**: Monitor cross-chain transactions and health
- **Chain Performance Hub**: Track performance across different blockchains

### 📊 Analytics & Intelligence
- **User Analytics**: Registration trends, retention, lifetime value
- **Platform Analytics**: System performance and optimization insights
- **Prestige System Analytics**: Track user progression through tier system

### 🎥 Live Streaming Management
- **Live Stream Monitoring**: Active streams, viewer counts, earnings
- **Streamer Management**: Approval system and revenue tracking
- **Content Moderation**: Chat monitoring and content controls

## 🛠 Installation

1. **Clone the repository** (if not already in PV3 directory):
   ```bash
   cd PV3/admin-dashboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001  # Your PV3 backend URL
   NEXT_PUBLIC_APP_NAME=PV3 Admin Dashboard
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## 🚀 Deployment

### Production Deployment (Vercel)
```bash
npm run deploy
```

### Staging Deployment
```bash
npm run deploy:staging
```

### Build for Production
```bash
npm run build
npm run start
```

## 📁 Project Structure

```
admin-dashboard/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Main dashboard overview
│   │   ├── globals.css        # Global styles
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── admin/             # Admin-specific components
│   │   │   ├── Header.tsx     # Main navigation header
│   │   │   ├── Sidebar.tsx    # Collapsible sidebar navigation
│   │   │   └── Layout.tsx     # Main layout wrapper
│   │   └── ui/                # Reusable UI components
│   │       ├── button.tsx     # Button component
│   │       └── card.tsx       # Card component
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   ├── services/
│   │   └── api.ts             # API service layer
│   ├── types/
│   │   └── admin.ts           # TypeScript type definitions
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
└── package.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | PV3 Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `PV3 Admin Dashboard` |
| `NEXTAUTH_SECRET` | Authentication secret | Required |
| `NEXTAUTH_URL` | Authentication URL | `http://localhost:3000` |

### API Integration

The dashboard communicates with the PV3 backend through the API service layer (`src/services/api.ts`). All endpoints are automatically authenticated using JWT tokens stored in localStorage.

## 🎯 Key Features

### Real-time Updates
- Live WebSocket connections for real-time data
- Automatic refresh of critical metrics
- Push notifications for important alerts

### Responsive Design
- Mobile-first design approach
- Collapsible sidebar for mobile devices
- Touch-optimized controls

### Security
- JWT-based authentication
- Role-based access control
- Audit trail for all administrative actions

### Performance
- Optimized bundle size with code splitting
- Lazy loading of components
- Efficient data fetching with React Query

## 🔐 Authentication

The admin dashboard uses wallet-based authentication:

1. **Connect Wallet**: Admin users connect their authorized wallet
2. **Sign Message**: Cryptographic signature verification
3. **JWT Token**: Secure session management
4. **Role Verification**: Admin role validation

## 📊 Monitoring & Analytics

### Real-time Metrics
- Active user count
- Live match monitoring
- Revenue tracking
- System health status

### Historical Data
- User growth trends
- Revenue analytics
- Game performance metrics
- Security incident logs

## 🚨 Emergency Controls

### Financial Emergency
- Emergency withdrawal systems
- Vault recovery procedures
- Transaction reversal capabilities

### Security Emergency
- Platform-wide emergency shutdown
- User suspension controls
- Fraud detection responses

### System Emergency
- Maintenance mode activation
- Service health monitoring
- Automated scaling responses

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use existing component patterns
3. Maintain responsive design principles
4. Add proper error handling
5. Include loading states
6. Write meaningful commit messages

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for complex functions

## 📝 Roadmap

### Upcoming Features
- [ ] Advanced AI analytics dashboard
- [ ] Multi-language support
- [ ] Advanced reporting system
- [ ] API rate limiting dashboard
- [ ] Mobile app version
- [ ] Advanced automation rules

### Future Integrations
- [ ] Discord bot management
- [ ] Social media analytics
- [ ] External API integrations
- [ ] Advanced notification system

## 🔧 Troubleshooting

### Common Issues

**1. API Connection Issues**
```bash
# Check if backend is running
curl http://localhost:3001/health

# Verify environment variables
echo $NEXT_PUBLIC_API_URL
```

**2. Authentication Problems**
- Clear localStorage: `localStorage.clear()`
- Check wallet connection
- Verify admin role in backend

**3. Build Issues**
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

## 📞 Support

For technical issues or feature requests, please contact the PV3 development team or create an issue in the repository.

## 📄 License

This project is part of the PV3 Web3 gaming platform. All rights reserved.

---

**PV3 Admin Dashboard** - Mission Control for the Future of Web3 Gaming
