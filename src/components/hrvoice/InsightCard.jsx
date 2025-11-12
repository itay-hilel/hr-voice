import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from "@/lib/utils";

const typeConfig = {
  urgent: {
    icon: AlertCircle,
    bg: "bg-gradient-to-br from-red-50 to-orange-50",
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600"
  },
  positive: {
    icon: CheckCircle,
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600"
  },
  info: {
    icon: Info,
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600"
  }
};

export default function InsightCard({ type = 'info', title, description, action }) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "relative overflow-hidden border-0 p-5 transition-all hover:shadow-lg",
      config.bg
    )}>
      <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 
                      rounded-full bg-white/30" />
      
      <div className="relative flex gap-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", config.iconBg)}>
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{title}</h4>
            <Badge className={cn("border text-xs", config.badgeClass)}>
              {type === 'urgent' ? 'Action Needed' : type === 'positive' ? 'Positive' : 'Insight'}
            </Badge>
          </div>
          <p className="text-sm text-gray-700 mb-3">{description}</p>
          {action && (
            <p className="text-xs font-medium text-gray-900 bg-white/60 rounded-lg px-3 py-2">
              💡 {action}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}