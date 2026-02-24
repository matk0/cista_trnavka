'use client';

interface ProgressBadgeProps {
  percentage: number;
  className?: string;
}

export default function ProgressBadge({
  percentage,
  className = '',
}: ProgressBadgeProps) {
  const displayPercentage = Math.round(percentage * 10) / 10;

  return (
    <div
      className={`bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-lg p-4 ${className}`}
    >
      <div className="text-center">
        <div className="text-3xl font-bold text-cyan-400">
          {displayPercentage}%
        </div>
        <div className="text-sm text-gray-400 mt-1">vyčistené</div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-500"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
