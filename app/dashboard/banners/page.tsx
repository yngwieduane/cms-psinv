"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import Pagination from "@/components/dashboard/Pagination";

interface Banner {
    id: string;
    title: string;
    subTitle: string;
    featured: boolean;
    city?: string;
    createdAt?: any;
    url?: string;
}

export default function BannerListPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Banner; direction: 'asc' | 'desc' }>({
        key: 'title',
        direction: 'asc',
    });

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "banners"));
            const items: Banner[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                items.push({
                    id: docSnap.id,
                    title: data.title,
                    subTitle: data.subTitle,
                    featured: data.featured,
                    city: data.city,
                    url: data.url,
                    createdAt: data.createdAt
                } as Banner);
            });
            setBanners(items);
        } catch (error) {
            console.error("Error fetching banners:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this banner?")) {
            try {
                await deleteDoc(doc(db, "banners", id));
                fetchBanners();
            } catch (error) {
                console.error("Error deleting banner:", error);
            }
        }
    };

    // Sort Handler
    const requestSort = (key: keyof Banner) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter & Sort Logic
    let processedBanners = [...banners];

    // 1. Filter
    processedBanners = processedBanners.filter(banner => {
        const query = searchQuery.toLowerCase();
        const titleMatch = banner.title?.toLowerCase().includes(query);
        const subTitleMatch = banner.subTitle?.toLowerCase().includes(query);
        return titleMatch || subTitleMatch;
    });

    // 2. Sort
    processedBanners.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA: any = a[key];
        let valueB: any = b[key];

        if (key === 'createdAt') {
            const dateA = valueA?.toMillis ? valueA.toMillis() : 0;
            const dateB = valueB?.toMillis ? valueB.toMillis() : 0;
            valueA = dateA;
            valueB = dateB;
        } else if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = valueB.toLowerCase();
        }

        if (valueA < valueB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valueA > valueB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // Pagination Logic
    const totalPages = Math.ceil(processedBanners.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = processedBanners.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Helper for Sort Icon
    const getSortIcon = (itemName: string) => {
        if (sortConfig.key !== itemName) {
            return (
                <svg className="w-3 h-3 ml-1 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-3 h-3 ml-1 text-[#3c64f4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
        ) : (
            <svg className="w-3 h-3 ml-1 text-[#3c64f4]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3c64f4]"></div>
            </div>
        );
    }

    return (
        <div className="text-gray-200">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-white mb-2">Banners Manager</h1>
                    <p className="text-[15px] text-gray-400">
                        Create and manage dynamic UI banners for your site.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/banners/new"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#3c64f4] hover:bg-blue-600 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Banner
                    </Link>
                </div>
            </div>

            {/* Main Content Area: Search & Table */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl overflow-hidden shadow-lg flex flex-col">
                {/* Search Bar */}
                <div className="p-4 border-b border-[#2d2d30]">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-gray-200 text-[15px] rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-all placeholder:text-gray-500"
                            placeholder="Search banners by title or subtitle..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2d2d30]">
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('title')}
                                >
                                    <div className="flex items-center">
                                        TITLE {getSortIcon('title')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('subTitle')}
                                >
                                    <div className="flex items-center">
                                        SUBTITLE {getSortIcon('subTitle')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('featured')}
                                >
                                    <div className="flex items-center">
                                        FEATURED {getSortIcon('featured')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('city')}
                                >
                                    <div className="flex items-center">
                                        CITY {getSortIcon('city')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider text-right">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d30]/60">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-[14px]">
                                        No banners found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-[#28282c] transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-[14px] font-semibold text-gray-200">
                                                {item.title || "Untitled"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[14px] text-gray-400">
                                            {item.subTitle || "—"}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            {item.featured ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-[12px] font-medium border border-[#10b981]/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Yes
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 text-[12px] font-medium border border-gray-500/20">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    No
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-[14px] text-gray-400">
                                            {item.city || <span className="text-gray-600">Global</span>}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/banners/${item.id}`}
                                                    className="p-2 rounded-md bg-[#2d2d30]/50 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                >
                                                    <Edit2 className="w-[18px] h-[18px]" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 rounded-md bg-[#2d2d30]/50 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                >
                                                    <Trash2 className="w-[18px] h-[18px]" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {processedBanners.length > 0 && (
                    <div className="border-t border-[#2d2d30] p-4 bg-[#212124]">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
