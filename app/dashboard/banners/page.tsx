"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw } from "lucide-react";
import Pagination from "@/components/dashboard/Pagination";

interface Banner {
    id: string;
    title: string;
    subTitle: string;
    featured: boolean;
    status?: string;
    city?: string;
    createdAt?: any;
    url?: string;
}

export default function BannerListPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    // Bulk select
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkUpdating, setBulkUpdating] = useState(false);

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
                    status: data.status || "Draft",
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
                setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                fetchBanners();
            } catch (error) {
                console.error("Error deleting banner:", error);
            }
        }
    };

    // ── Bulk status update ──────────────────────────────────────────────
    const handleBulkStatusUpdate = async (newStatus: "Live" | "Draft") => {
        if (selectedIds.size === 0) return;
        setBulkUpdating(true);
        try {
            const batch = writeBatch(db);
            selectedIds.forEach(id => {
                batch.update(doc(db, "banners", id), { status: newStatus });
            });
            await batch.commit();

            // Optimistically update local state
            setBanners(prev =>
                prev.map(b => selectedIds.has(b.id) ? { ...b, status: newStatus } : b)
            );
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Bulk update failed:", error);
            alert("Failed to update status for some banners.");
        } finally {
            setBulkUpdating(false);
        }
    };

    // ── Selection helpers ──────────────────────────────────────────────
    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAllOnPage = () => {
        const allSelected = currentItems.every(i => selectedIds.has(i.id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                currentItems.forEach(i => next.delete(i.id));
            } else {
                currentItems.forEach(i => next.add(i.id));
            }
            return next;
        });
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

    processedBanners = processedBanners.filter(banner => {
        const query = searchQuery.toLowerCase();
        const titleMatch = banner.title?.toLowerCase().includes(query);
        const subTitleMatch = banner.subTitle?.toLowerCase().includes(query);
        return titleMatch || subTitleMatch;
    });

    processedBanners.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA: any = a[key];
        let valueB: any = b[key];

        if (key === 'createdAt') {
            valueA = valueA?.toMillis ? valueA.toMillis() : 0;
            valueB = valueB?.toMillis ? valueB.toMillis() : 0;
        } else if (typeof valueA === 'string') {
            valueA = valueA.toLowerCase();
            valueB = (valueB as string).toLowerCase();
        }

        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination Logic
    const totalPages = Math.ceil(processedBanners.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = processedBanners.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => setCurrentPage(page);

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

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

    const allOnPageSelected = currentItems.length > 0 && currentItems.every(i => selectedIds.has(i.id));
    const someOnPageSelected = currentItems.some(i => selectedIds.has(i.id));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3c64f4]"></div>
            </div>
        );
    }

    return (
        <div className="text-gray-200 relative pb-24">
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

            {/* Main Content Area */}
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
                    <table className="w-full text-left border-collapse table-fixed min-w-[920px]">
                        <thead>
                            <tr className="border-b border-[#2d2d30]">
                                {/* Select-all */}
                                <th className="w-[48px] px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        ref={el => { if (el) el.indeterminate = someOnPageSelected && !allOnPageSelected; }}
                                        onChange={toggleAllOnPage}
                                        className="w-4 h-4 rounded border-[#3e3e42] bg-[#1c1c1f] accent-[#3c64f4] cursor-pointer"
                                    />
                                </th>
                                <th className="w-[22%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors" onClick={() => requestSort('title')}>
                                    <div className="flex items-center">TITLE {getSortIcon('title')}</div>
                                </th>
                                <th className="w-[22%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors" onClick={() => requestSort('subTitle')}>
                                    <div className="flex items-center">SUBTITLE {getSortIcon('subTitle')}</div>
                                </th>
                                <th className="w-[11%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors" onClick={() => requestSort('featured')}>
                                    <div className="flex items-center">FEATURED {getSortIcon('featured')}</div>
                                </th>
                                <th className="w-[11%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors" onClick={() => requestSort('status')}>
                                    <div className="flex items-center">STATUS {getSortIcon('status')}</div>
                                </th>
                                <th className="w-[11%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors" onClick={() => requestSort('city')}>
                                    <div className="flex items-center">CITY {getSortIcon('city')}</div>
                                </th>
                                <th className="w-[13%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider text-right">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d30]/60">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 text-[14px]">
                                        No banners found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item) => {
                                    const isSelected = selectedIds.has(item.id);
                                    return (
                                        <tr
                                            key={item.id}
                                            className={`transition-colors group ${isSelected
                                                ? 'bg-[#3c64f4]/5 border-l-2 border-l-[#3c64f4]'
                                                : 'hover:bg-[#28282c] border-l-2 border-l-transparent'
                                            }`}
                                        >
                                            <td className="px-4 py-5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleRow(item.id)}
                                                    className="w-4 h-4 rounded border-[#3e3e42] bg-[#1c1c1f] accent-[#3c64f4] cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap overflow-hidden">
                                                <div className="text-[14px] font-semibold text-gray-200 truncate w-full pr-4" title={item.title || "Untitled"}>
                                                    {item.title || "Untitled"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap overflow-hidden">
                                                <div className="text-[14px] text-gray-400 truncate w-full pr-4" title={item.subTitle || "—"}>
                                                    {item.subTitle || "—"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {item.featured ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-[12px] font-medium border border-[#10b981]/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 text-[12px] font-medium border border-gray-500/20">
                                                        <XCircle className="w-3.5 h-3.5" /> No
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {item.status === "Live" ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-[12px] font-medium border border-[#10b981]/20">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Live
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-400 text-[12px] font-medium border border-gray-500/20">
                                                        <XCircle className="w-3.5 h-3.5" /> Draft
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
                                    );
                                })
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

            {/* ── Floating Bulk Action Bar ─────────────────────────────── */}
            <div
                className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-out ${
                    selectedIds.size > 0
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
            >
                <div className="flex items-center gap-3 px-5 py-3 bg-[#212124] border border-[#3e3e42] rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-sm">
                    {/* Count */}
                    <div className="flex items-center gap-2 pr-3 border-r border-[#3e3e42]">
                        <div className="min-w-[20px] h-5 rounded-full bg-[#3c64f4] flex items-center justify-center text-[10px] font-bold text-white px-1.5">
                            {selectedIds.size}
                        </div>
                        <span className="text-sm text-gray-300 font-medium whitespace-nowrap">
                            {selectedIds.size === 1 ? '1 banner selected' : `${selectedIds.size} banners selected`}
                        </span>
                    </div>

                    {/* Set Live */}
                    <button
                        onClick={() => handleBulkStatusUpdate("Live")}
                        disabled={bulkUpdating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-sm font-semibold hover:bg-[#10b981]/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {bulkUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                        Set Live
                    </button>

                    {/* Set Draft */}
                    <button
                        onClick={() => handleBulkStatusUpdate("Draft")}
                        disabled={bulkUpdating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 text-sm font-semibold hover:bg-gray-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {bulkUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <EyeOff className="w-3.5 h-3.5" />}
                        Set Draft
                    </button>

                    {/* Clear */}
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 text-sm hover:text-gray-300 hover:bg-[#2d2d30] transition-colors"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
