'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { GlassCard } from './GlassmorphismCard';
import { cn } from '@/lib/utils';

interface ChartData {
  name: string;
  value: number;
  timestamp?: number;
}

interface ModernChartProps {
  data: ChartData[];
  type?: 'line' | 'area' | 'bar';
  title?: string;
  subtitle?: string;
  color?: string;
  height?: number;
  className?: string;
  animate?: boolean;
  showGrid?: boolean;
  showAxis?: boolean;
}

export default function ModernChart({
  data,
  type = 'line',
  title,
  subtitle,
  color = '#01d3f4',
  height = 300,
  className,
  animate = true,
  showGrid = true,
  showAxis = true
}: ModernChartProps) {
  const [animatedData, setAnimatedData] = useState<ChartData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (animate) {
      // Animate data in gradually
      const timer = setTimeout(() => {
        setIsVisible(true);
        data.forEach((_, index) => {
          setTimeout(() => {
            setAnimatedData(prev => [...prev, data[index]]);
          }, index * 100);
        });
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setAnimatedData(data);
      setIsVisible(true);
    }
  }, [data, animate]);

  const renderChart = () => {
    const commonProps = {
      data: animatedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    };

    const axisProps = showAxis ? {
      axisLine: false,
      tickLine: false,
      tick: { fill: '#808080', fontSize: 12 },
    } : false;

    const gridProps = showGrid ? {
      strokeDasharray: '3 3',
      stroke: 'rgba(255, 255, 255, 0.1)',
    } : false;

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            {showAxis && <XAxis dataKey="name" {...axisProps} />}
            {showAxis && <YAxis {...axisProps} />}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#areaGradient)"
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            {showAxis && <XAxis dataKey="name" {...axisProps} />}
            {showAxis && <YAxis {...axisProps} />}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <Bar
              dataKey="value"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            {showAxis && <XAxis dataKey="name" {...axisProps} />}
            {showAxis && <YAxis {...axisProps} />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: color, stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        );
    }
  };

  return (
    <GlassCard className={cn('p-6', className)}>
      {(title || subtitle) && (
        <div className="mb-6 space-y-1">
          {title && (
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              className="text-xl font-bold gradient-text"
            >
              {title}
            </motion.h3>
          )}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20 }}
              transition={{ delay: 0.1 }}
              className="text-text-secondary"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </motion.div>
    </GlassCard>
  );
}

// Specialized chart components
export function PerformanceChart({ className }: { className?: string }) {
  const performanceData = [
    { name: '00:00', value: 12 },
    { name: '04:00', value: 15 },
    { name: '08:00', value: 8 },
    { name: '12:00', value: 11 },
    { name: '16:00', value: 9 },
    { name: '20:00', value: 13 },
    { name: '24:00', value: 10 },
  ];

  return (
    <ModernChart
      data={performanceData}
      type="area"
      title="Response Time"
      subtitle="Average response time over 24 hours"
                    color="#01d3f4"
      className={className}
    />
  );
}

export function ThroughputChart({ className }: { className?: string }) {
  const throughputData = [
    { name: 'Jan', value: 45000 },
    { name: 'Feb', value: 48000 },
    { name: 'Mar', value: 52000 },
    { name: 'Apr', value: 47000 },
    { name: 'May', value: 55000 },
    { name: 'Jun', value: 58000 },
  ];

  return (
    <ModernChart
      data={throughputData}
      type="bar"
      title="Monthly Throughput"
      subtitle="Requests per second by month"
                    color="#0b86f8"
      className={className}
    />
  );
}

export function UptimeChart({ className }: { className?: string }) {
  const uptimeData = [
    { name: 'Week 1', value: 99.98 },
    { name: 'Week 2', value: 99.99 },
    { name: 'Week 3', value: 99.97 },
    { name: 'Week 4', value: 99.99 },
    { name: 'Week 5', value: 100 },
    { name: 'Week 6', value: 99.98 },
  ];

  return (
    <ModernChart
      data={uptimeData}
      type="line"
      title="Uptime Percentage"
      subtitle="Weekly uptime statistics"
      color="#8B5CF6"
      className={className}
    />
  );
}