
import { cn } from '@/lib/utils';
import { AmendmentStatus as AmendmentStatusType } from '@/types';

interface AmendmentStatusProps {
  status: AmendmentStatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function AmendmentStatus({
  status,
  size = 'md',
  showLabel = true,
}: AmendmentStatusProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusConfig = {
    pending: {
      label: 'Pending',
      className: 'bg-amendment-pending text-gray-700 border-gray-200',
    },
    quality: {
      label: 'Quality Approved',
      className: 'bg-amendment-quality text-amber-800 border-amber-200',
    },
    approved: {
      label: 'Authority Approved',
      className: 'bg-amendment-approved text-emerald-800 border-emerald-200',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  const { label, className } = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('rounded-full h-2 w-2 mr-1.5', {
        'bg-gray-400': status === 'pending',
        'bg-amber-500': status === 'quality',
        'bg-emerald-500': status === 'approved',
        'bg-red-500': status === 'rejected',
      })}></span>
      {showLabel ? label : null}
    </span>
  );
}
