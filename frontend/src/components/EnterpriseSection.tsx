'use client';

import { motion } from 'framer-motion';
import { 
  Shield, 
  Clock, 
  Award, 
  FileCheck, 
  Headphones, 
  Building2,
  CheckCircle,
  Phone,
  MessageSquare,
  Lock,
  Globe
} from 'lucide-react';

const enterpriseFeatures = [
  {
    icon: Shield,
    title: 'SOC 2 Type II Compliant',
    description: 'Enterprise-grade security audits and compliance certifications for regulated industries',
    details: ['Annual security audits', 'Data encryption at rest & transit', 'Access control & monitoring']
  },
  {
    icon: FileCheck,
    title: 'Custom SLA Agreements',
    description: '99.99% uptime guarantees with financial penalties for non-compliance',
    details: ['Guaranteed uptime SLAs', 'Response time commitments', 'Financial compensation terms']
  },
  {
    icon: Headphones,
    title: '24/7 White-Glove Support',
    description: 'Dedicated support team with direct engineering access and priority escalation',
    details: ['Dedicated account manager', 'Direct engineering hotline', 'Priority ticket resolution']
  },
  {
    icon: Building2,
    title: 'Enterprise Infrastructure',
    description: 'Dedicated nodes, custom configurations, and multi-region deployments',
    details: ['Dedicated hardware allocation', 'Custom node configurations', 'Geographic redundancy']
  },
  {
    icon: Lock,
    title: 'Advanced Security',
    description: 'IP whitelisting, VPN access, and custom authentication methods',
    details: ['IP address restrictions', 'VPN tunnel support', 'Multi-factor authentication']
  },
  {
    icon: Globe,
    title: 'Global Edge Network',
    description: 'Low-latency access from 15+ global locations with intelligent routing',
    details: ['Global edge deployment', 'Intelligent traffic routing', 'Regional failover support']
  }
];

const complianceStandards = [
  { name: 'SOC 2 Type II', status: 'Certified', icon: Award },
  { name: 'ISO 27001', status: 'In Progress', icon: Shield },
  { name: 'GDPR Compliant', status: 'Certified', icon: Lock },
  { name: 'CCPA Compliant', status: 'Certified', icon: FileCheck }
];

const supportTiers = [
  {
    name: 'Enterprise Support',
    response: '< 1 hour',
    availability: '24/7/365',
    channels: ['Phone', 'Email', 'Slack', 'Teams'],
    features: ['Dedicated account manager', 'Direct engineering access', 'Priority escalation']
  },
  {
    name: 'Mission Critical',
    response: '< 15 minutes',
    availability: '24/7/365',
    channels: ['Phone', 'Email', 'Slack', 'Teams', 'Emergency Hotline'],
    features: ['Dedicated support team', 'Real-time monitoring alerts', 'Proactive issue resolution']
  }
];

export default function EnterpriseSection() {
  return (
    <div className="section-padding bg-bg-main relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Removed interfering background gradient */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-5" />
      </div>

      <div className="container-width relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-n0de-purple/10 text-n0de-purple px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Building2 className="w-4 h-4" />
            <span>Enterprise Grade</span>
          </div>
          
          <h2 className="text-4xl lg:text-6xl font-bold font-display mb-6">
            <span className="text-white">Built For</span>
            <br />
            <span className="gradient-text">Enterprise Scale</span>
          </h2>
          
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            From Fortune 500 companies to high-frequency trading firms, N0DE delivers 
            the reliability, security, and support that enterprise applications demand.
          </p>
        </motion.div>

        {/* Enterprise Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {enterpriseFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="card group hover:border-n0de-blue/50 transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-n0de-blue/10 rounded-lg group-hover:bg-n0de-blue/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-n0de-blue" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                </div>
                
                <p className="text-text-secondary mb-4">{feature.description}</p>
                
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compliance Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="card mb-16"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4 gradient-text">
                Security & Compliance
              </h3>
              <p className="text-text-secondary text-lg">
                Meeting the highest standards for data protection and regulatory compliance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {complianceStandards.map((standard, index) => (
                <motion.div
                  key={standard.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center p-6 bg-bg-main rounded-lg border border-border"
                >
                  <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${
                      standard.status === 'Certified' 
                        ? 'bg-n0de-green/10 text-n0de-green' 
                        : 'bg-n0de-blue/10 text-n0de-blue'
                    }`}>
                      <standard.icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <h4 className="font-bold mb-2">{standard.name}</h4>
                  
                  <div className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    standard.status === 'Certified'
                      ? 'bg-n0de-green/20 text-n0de-green'
                      : 'bg-n0de-blue/20 text-n0de-blue'
                  }`}>
                    {standard.status === 'Certified' ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    <span>{standard.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Support Tiers */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="card"
        >
          <div className="p-8">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4 gradient-text">
                24/7 Enterprise Support
              </h3>
              <p className="text-text-secondary text-lg">
                Get the support you need, when you need it, with guaranteed response times
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {supportTiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className={`p-6 rounded-lg border-2 ${
                    index === 1 
                      ? 'border-n0de-purple bg-n0de-purple/5' 
                      : 'border-border bg-bg-main'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-2xl font-bold">{tier.name}</h4>
                    {index === 1 && (
                      <div className="bg-n0de-purple text-white px-3 py-1 rounded-full text-xs font-semibold">
                        PREMIUM
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-bg-elevated rounded-lg">
                      <div className="text-2xl font-bold text-n0de-green">{tier.response}</div>
                      <div className="text-sm text-text-muted">Response Time</div>
                    </div>
                    <div className="text-center p-4 bg-bg-elevated rounded-lg">
                      <div className="text-2xl font-bold text-n0de-blue">{tier.availability}</div>
                      <div className="text-sm text-text-muted">Availability</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h5 className="font-semibold mb-3">Support Channels</h5>
                    <div className="flex flex-wrap gap-2">
                      {tier.channels.map((channel) => (
                        <span key={channel} className="bg-bg-elevated px-3 py-1 rounded-full text-sm">
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold mb-3">Features</h5>
                    <ul className="space-y-2">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-n0de-green flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary text-lg px-8 py-4"
              >
                Contact Enterprise Sales
              </motion.button>
              
              <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-text-secondary">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>+1 (555) SOLANA-1</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>enterprise@N0DE.com</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}