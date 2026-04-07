"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/dashboard/StatsCard";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ActivityItem {
    id: string;
    title: string;
    type: "Article" | "Blog";
    timestamp: number;
    timeAgo: string;
}

export default function DashboardPage() {
    const [stats, setStats] = useState({ articles: 0, blogs: 0, banners: 0 });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // Fetch Articles
                const articlesSnap = await getDocs(collection(db, "articles"));

                // Fetch Blogs
                const blogsSnap = await getDocs(collection(db, "blog_posts"));

                // Fetch Banners
                const bannersSnap = await getDocs(collection(db, "banners"));

                setStats({
                    articles: articlesSnap.size,
                    blogs: blogsSnap.size,
                    banners: bannersSnap.size
                });

                // Process Recent Activity
                const activities: ActivityItem[] = [];
                const now = Date.now();

                const getTimeAgo = (timestamp: number) => {
                    const diffMins = Math.max(0, Math.floor((now - timestamp) / (1000 * 60))); // Avoid negative mins
                    if (diffMins < 1) return `Just now`;
                    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
                    const diffHours = Math.floor(diffMins / 60);
                    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                    const diffDays = Math.floor(diffHours / 24);
                    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
                };

                articlesSnap.forEach(doc => {
                    const data = doc.data();
                    const title = data.translations?.en?.title || data.title || "Untitled Article";

                    // Determine timestamp. Try updatedAt, then createdAt, then fallback.
                    let ts = now;
                    if (data.updatedAt?.toMillis) ts = data.updatedAt.toMillis();
                    else if (data.createdAt?.toMillis) ts = data.createdAt.toMillis();

                    activities.push({
                        id: doc.id,
                        title,
                        type: "Article",
                        timestamp: ts,
                        timeAgo: getTimeAgo(ts)
                    });
                });

                blogsSnap.forEach(doc => {
                    const data = doc.data();
                    const title = data.title || "Untitled Blog";

                    // Determine timestamp. Try lastSyncedAt, then date string, then fallback.
                    let ts = now;
                    if (data.lastSyncedAt?.toMillis) ts = data.lastSyncedAt.toMillis();
                    else if (data.date) ts = new Date(data.date).getTime();

                    activities.push({
                        id: doc.id,
                        title,
                        type: "Blog",
                        timestamp: ts,
                        timeAgo: getTimeAgo(ts)
                    });
                });

                // Sort by timestamp desc and take top 5
                activities.sort((a, b) => b.timestamp - a.timestamp);
                setRecentActivity(activities.slice(0, 5));

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    return (
        <>
            {/* Page Title */}
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-white">Overview</h1>
                <p className="text-[15px] text-gray-400 mt-1">
                    Welcome back, here's what's happening today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Total Articles"
                    value={loading ? "..." : stats.articles.toString()}
                    change="live"
                    changeType="increase"
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                    }
                />
                <StatsCard
                    title="Total Blogs"
                    value={loading ? "..." : stats.blogs.toString()}
                    change="live"
                    changeType="increase"
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    }
                />
                <StatsCard
                    title="Total Banners"
                    value={loading ? "..." : stats.banners.toString()}
                    change="live"
                    changeType="increase"
                    icon={
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    }
                />
            </div>

            {/* Content Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area Placeholder */}
                <div className="lg:col-span-2 bg-[#212124] p-6 rounded-xl shadow-sm border border-[#2d2d30]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                            Traffic Overview
                        </h3>
                        <button className="text-[#3c64f4] text-sm font-medium hover:text-[#3c64f4]/80">
                            View Report
                        </button>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-[#1c1c1f] rounded-lg border border-dashed border-[#2d2d30]">
                        <p className="text-gray-500">Chart Visualization Placeholder</p>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-[#212124] p-6 rounded-xl shadow-sm border border-[#2d2d30]">
                    <h3 className="text-lg font-semibold text-white mb-4">
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-sm text-gray-500">Loading activity...</p>
                        ) : recentActivity.length > 0 ? (
                            recentActivity.map((item, i) => (
                                <div key={i} className="flex items-start space-x-3">
                                    <div className={`w-2 h-2 mt-2 rounded-full ${item.type === 'Article' ? 'bg-[#10b981]' : 'bg-[#3c64f4]'} shadow-[0_0_8px_rgba(60,100,244,0.3)]`}></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-300">
                                            {item.type} {item.id === "new" ? "created" : "updated"}
                                        </p>
                                        <p className="font-semibold text-white text-sm mt-0.5 truncate max-w-[200px] xl:max-w-[260px]" title={item.title}>
                                            {item.title}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-wider font-bold">{item.timeAgo}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">No recent activity found.</p>
                        )}
                    </div>
                    <button className="w-full mt-6 py-2 text-sm text-gray-400 bg-[#2d2d30]/50 rounded-lg hover:bg-[#2d2d30] hover:text-white transition-colors">
                        View All History
                    </button>
                </div>
            </div>
        </>
    );
}
