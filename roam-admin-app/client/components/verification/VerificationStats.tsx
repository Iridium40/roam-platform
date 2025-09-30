import React from 'react';
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface VerificationStats {
  total: number;
  pending: number;
  suspended: number;
  approved: number;
  rejected: number;
  overdue: number;
}

interface VerificationStatsProps {
  stats: VerificationStats;
}

export function VerificationStats({ stats }: VerificationStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      <ROAMStatCard
        title="Total"
        value={stats.total.toString()}
        icon={<FileText className="w-5 h-5" />}
        subtitle="businesses"
        changeType="neutral"
      />
      <ROAMStatCard
        title="Pending"
        value={stats.pending.toString()}
        icon={<Clock className="w-5 h-5" />}
        subtitle="awaiting review"
        changeType="neutral"
      />
      <ROAMStatCard
        title="Suspended"
        value={stats.suspended.toString()}
        icon={<AlertTriangle className="w-5 h-5" />}
        subtitle="suspended"
        changeType="negative"
      />
      <ROAMStatCard
        title="Approved"
        value={stats.approved.toString()}
        icon={<CheckCircle className="w-5 h-5" />}
        subtitle="verified"
        changeType="positive"
      />
      <ROAMStatCard
        title="Rejected"
        value={stats.rejected.toString()}
        icon={<XCircle className="w-5 h-5" />}
        subtitle="declined"
        changeType="negative"
      />
      <ROAMStatCard
        title="Overdue"
        value={stats.overdue.toString()}
        icon={<AlertTriangle className="w-5 h-5" />}
        subtitle="past due"
        changeType="negative"
      />
    </div>
  );
}