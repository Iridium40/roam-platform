import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Puzzle, DollarSign, TrendingUp, Package } from 'lucide-react';
import { AddonStats } from '@/types/addons';

interface AddonStatsSectionProps {
  stats: AddonStats;
}

export function AddonStatsSection({ stats }: AddonStatsSectionProps) {
  const statCards = [
    {
      title: 'Total Add-ons',
      value: stats.total_addons,
      icon: Puzzle,
      description: 'Eligible add-ons',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: 'Available',
      value: stats.available_addons,
      icon: Package,
      description: 'Currently available',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Avg. Price',
      value: `$${stats.avg_price.toFixed(2)}`,
      icon: TrendingUp,
      description: 'Average add-on price',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: 'Total Revenue',
      value: `$${stats.total_revenue.toFixed(2)}`,
      icon: DollarSign,
      description: 'From configured add-ons',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`rounded-full p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
