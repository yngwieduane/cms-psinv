import React from "react";

interface StatsCardProps {
    title: string;
    value: string;
    change: string;
    changeType: "increase" | "decrease" | "neutral";
    icon: React.ReactNode;
}

export default function StatsCard({
    title,
    value,
    change,
    changeType,
    icon,
}: StatsCardProps) {
    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                    {icon}
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span
                    className={`font-medium ${changeType === "increase"
                            ? "text-green-600"
                            : changeType === "decrease"
                                ? "text-red-600"
                                : "text-gray-500"
                        }`}
                >
                    {change}
                </span>
                <span className="text-gray-500 ml-2">from last month</span>
            </div>
        </div>
    );
}
