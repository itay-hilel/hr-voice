import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatsCard({ icon: Icon, label, value, trend, colorClass, bgClass }) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 p-6 transition-all hover:scale-105 hover:shadow-lg",
      bgClass || "bg-gradient-to-br from-purple-50 to-pink-50"
    )}>
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-20" 
           style={{ background: 'radial-gradient(circle, currentColor 0%, transparent 70%)' }} />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-2 font-medium", 
              trend.startsWith('+') ? 'text-green-600' : 'text-gray-500'
            )}>
              {trend}
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center",
          colorClass || "bg-purple-100"
        )}>
          <Icon className={cn("w-6 h-6", colorClass?.replace('bg-', 'text-').replace('-100', '-600'))} />
        </div>
      </div>
    </Card>
  );
}