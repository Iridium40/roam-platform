import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  fees: number;
}

interface FinancialChartProps {
  data: RevenueData[];
  type: "line" | "bar" | "pie";
  height?: number;
  className?: string;
}

const COLORS = {
  revenue: "#10b981",
  bookings: "#3b82f6",
  fees: "#f59e0b",
};

export const FinancialChart: React.FC<FinancialChartProps> = ({
  data,
  type,
  height = 300,
  className = "",
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {entry.name}: {entry.name === "Revenue" ? formatCurrency(entry.value) : formatNumber(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => formatCurrency(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={COLORS.revenue}
          strokeWidth={3}
          dot={{ fill: COLORS.revenue, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: COLORS.revenue, strokeWidth: 2 }}
          name="Revenue"
        />
        <Line
          type="monotone"
          dataKey="fees"
          stroke={COLORS.fees}
          strokeWidth={2}
          dot={{ fill: COLORS.fees, strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, stroke: COLORS.fees, strokeWidth: 2 }}
          name="Platform Fees"
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => formatNumber(value)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="bookings" fill={COLORS.bookings} name="Bookings" radius={[4, 4, 0, 0]} />
        <Bar dataKey="revenue" fill={COLORS.revenue} name="Revenue" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => {
    // Transform data for pie chart - show total revenue breakdown
    const pieData = [
      { name: "Net Revenue", value: data.reduce((sum, item) => sum + item.revenue - item.fees, 0) },
      { name: "Platform Fees", value: data.reduce((sum, item) => sum + item.fees, 0) },
    ];

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.revenue : COLORS.fees} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [formatCurrency(value), "Amount"]}
            labelFormatter={(label) => label}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (type) {
      case "line":
        return renderLineChart();
      case "bar":
        return renderBarChart();
      case "pie":
        return renderPieChart();
      default:
        return renderLineChart();
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground ${className}`} style={{ height }}>
        <div className="text-center">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {renderChart()}
    </div>
  );
};

export default FinancialChart;
