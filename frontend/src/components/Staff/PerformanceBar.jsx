import React from 'react';

const PerformanceBar = ({ actualTime, predictedTime }) => {
    // Calculate percentage (capped at 100% for visual sanity)
    // If actualTime is small, we show progress towards predictedTime

    const progress = Math.min((actualTime / predictedTime) * 100, 100);

    // Color logic
    // Green: < 80% of predicted
    // Yellow: 80% - 100%
    // Red: > 100%

    let colorClass = 'bg-emerald-500';
    if (actualTime > predictedTime) {
        colorClass = 'bg-red-500';
    } else if (actualTime > predictedTime * 0.8) {
        colorClass = 'bg-yellow-500';
    }

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs mb-1 text-gray-400 font-mono">
                <span>Running Time</span>
                <span>Target: {predictedTime}m</span>
            </div>
            <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} transition-all duration-1000 ease-linear`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};

export default PerformanceBar;
