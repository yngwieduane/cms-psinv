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
        <div className="p-6 bg-[#212124] rounded-xl shadow-sm border border-[#2d2d30]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold tracking-wider text-gray-500 mb-1">{title.toUpperCase()}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
                <div className="p-3 bg-[#2a385f] rounded-lg text-[#3c64f4]">
                    {icon}
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span
                    className={`font-medium ${changeType === "increase"
                        ? "text-[#4ade80]"
                        : changeType === "decrease"
                            ? "text-red-400"
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
