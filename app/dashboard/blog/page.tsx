"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2, Eye, ChevronDown, X, Link as LinkIcon } from "lucide-react";

interface BlogPost {
    id: string; // Document ID (which is the slug)
    title: string;
    author: string;
    category?: string;
    date: string;
    status?: string;
    // other fields unnecessary for list view
}

import Pagination from "@/components/dashboard/Pagination";

export default function BlogListPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: keyof BlogPost; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc',
    });

    // Preview Drawer State
    const [previewUrl, setPreviewUrl] = useState("");
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Bulk Edit State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState("");
    const [applyingBulk, setApplyingBulk] = useState(false);

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "blog_posts"));
            const postData: BlogPost[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                postData.push({
                    id: doc.id,
                    title: data.title,
                    author: data.author,
                    category: data.category,
                    date: data.date,
                    status: data.status,
                } as BlogPost);
            });
            setPosts(postData);
        } catch (error) {
            console.error("Error fetching blog posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this post?")) {
            try {
                await deleteDoc(doc(db, "blog_posts", id));
                fetchPosts();
            } catch (error) {
                console.error("Error deleting post:", error);
            }
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateDoc(doc(db, "blog_posts", id), { status: newStatus });
            setPosts(prev =>
                prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
            );
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    // Bulk Operations
    const toggleSelectAll = () => {
        if (selectedIds.size === currentPosts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(currentPosts.map(p => p.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkApply = async () => {
        if (!bulkAction || selectedIds.size === 0) return;

        if (bulkAction === "delete") {
            if (!confirm(`Are you sure you want to delete ${selectedIds.size} post(s)?`)) return;
        }

        setApplyingBulk(true);
        try {
            const promises = Array.from(selectedIds).map(async (id) => {
                if (bulkAction === "delete") {
                    return deleteDoc(doc(db, "blog_posts", id));
                } else {
                    // bulkAction is "Published" or "Draft"
                    return updateDoc(doc(db, "blog_posts", id), { status: bulkAction });
                }
            });

            await Promise.all(promises);
            setSelectedIds(new Set());
            setBulkAction("");
            fetchPosts();
        } catch (error) {
            console.error("Error applying bulk action:", error);
        } finally {
            setApplyingBulk(false);
        }
    };

    // Sort Handler
    const requestSort = (key: keyof BlogPost) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter & Sort Logic
    let processedPosts = [...posts];

    // 1. Filter
    processedPosts = processedPosts.filter(post => {
        const query = searchQuery.toLowerCase();
        const titleMatch = post.title?.toLowerCase().includes(query);
        const authorMatch = post.author?.toLowerCase().includes(query);
        const categoryMatch = post.category?.toLowerCase().includes(query);
        return titleMatch || authorMatch || categoryMatch;
    });

    // 2. Sort
    processedPosts.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA: any = a[key] || '';
        let valueB: any = b[key] || '';

        if (key === 'date') {
            const dateA = new Date(valueA);
            const dateB = new Date(valueB);
            valueA = dateA.getTime();
            valueB = dateB.getTime();
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
    const totalPages = Math.ceil(processedPosts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentPosts = processedPosts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Clear selection when page changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [currentPage]);

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
                    <h1 className="text-[28px] font-bold text-white mb-2">Blog Posts HQ</h1>
                    <p className="text-[15px] text-gray-400">
                        Manage your blog content portfolio.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/blog/new"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#3c64f4] hover:bg-blue-600 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add New Post
                    </Link>
                </div>
            </div>

            {/* Main Content Area: Search & Table */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl overflow-hidden shadow-lg flex flex-col">
                {/* Search Bar & Bulk Actions */}
                <div className="p-4 border-b border-[#2d2d30] space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            className="w-full bg-[#1c1c1f] border border-[#2d2d30] text-gray-200 text-[15px] rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-all placeholder:text-gray-500"
                            placeholder="Search blog posts by title, author, or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 px-1 py-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <span className="text-sm text-gray-400">
                                <span className="font-semibold text-white">{selectedIds.size}</span> selected
                            </span>
                            <div className="h-4 w-px bg-[#3e3e42]"></div>
                            <div className="relative">
                                <select
                                    value={bulkAction}
                                    onChange={(e) => setBulkAction(e.target.value)}
                                    className="appearance-none bg-[#1c1c1f] border border-[#3e3e42] text-gray-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#3c64f4] transition-colors cursor-pointer"
                                >
                                    <option value="">Bulk action...</option>
                                    <option value="Published">Set Live (Published)</option>
                                    <option value="Draft">Set Draft</option>
                                    <option value="delete">Delete</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                            <button
                                onClick={handleBulkApply}
                                disabled={!bulkAction || applyingBulk}
                                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#3c64f4] text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {applyingBulk ? "Applying..." : "Apply"}
                            </button>
                            <button
                                onClick={() => { setSelectedIds(new Set()); setBulkAction(""); }}
                                className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2d2d30]">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={currentPosts.length > 0 && selectedIds.size === currentPosts.length}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded border-[#3e3e42] bg-[#1c1c1f] text-[#3c64f4] focus:ring-[#3c64f4] focus:ring-offset-0 cursor-pointer accent-[#3c64f4]"
                                    />
                                </th>
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
                                    onClick={() => requestSort('author')}
                                >
                                    <div className="flex items-center">
                                        AUTHOR {getSortIcon('author')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('category')}
                                >
                                    <div className="flex items-center">
                                        CATEGORY {getSortIcon('category')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('status')}
                                >
                                    <div className="flex items-center">
                                        STATUS {getSortIcon('status')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider text-right">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d30]/60">
                            {currentPosts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-[14px]">
                                        No blog posts found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentPosts.map((post) => {
                                    const postPreviewUrl = post.id ? `https://www.psinv.net/en/blog/${post.id}` : "";
                                    return (
                                        <tr key={post.id} className={`hover:bg-[#28282c] transition-colors group ${selectedIds.has(post.id) ? 'bg-[#3c64f4]/5' : ''}`}>
                                            <td className="px-6 py-5 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(post.id)}
                                                    onChange={() => toggleSelectOne(post.id)}
                                                    className="w-4 h-4 rounded border-[#3e3e42] bg-[#1c1c1f] text-[#3c64f4] focus:ring-[#3c64f4] focus:ring-offset-0 cursor-pointer accent-[#3c64f4]"
                                                />
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-[14px] font-semibold text-gray-200">
                                                    {post.title || "Untitled"}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {post.date || "No date"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-[14px] text-gray-400">
                                                {post.author || "—"}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-md bg-[#2d2d30] text-gray-300 border border-[#3e3e42]">
                                                    {post.category || "Uncategorized"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="relative inline-block">
                                                    <select
                                                        value={post.status || "Draft"}
                                                        onChange={(e) => handleStatusChange(post.id, e.target.value)}
                                                        className={`appearance-none text-xs font-semibold rounded-md border px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#3c64f4] transition-colors ${
                                                            (post.status || "Draft") === 'Published'
                                                                ? 'bg-green-400/10 text-[#4ade80] border-green-400/20'
                                                                : 'bg-[#2d2d30]/50 text-gray-300 border-[#3e3e42]'
                                                        }`}
                                                    >
                                                        <option value="Draft" className="bg-[#1c1c1f] text-gray-300">Draft</option>
                                                        <option value="Published" className="bg-[#1c1c1f] text-gray-300">Published</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (postPreviewUrl) {
                                                                setPreviewUrl(postPreviewUrl);
                                                                setIsPreviewOpen(true);
                                                            }
                                                        }}
                                                        disabled={!postPreviewUrl}
                                                        className={`p-2 rounded-md bg-[#2d2d30]/50 transition-colors ${postPreviewUrl ? 'text-gray-500 hover:text-[#3c64f4] hover:bg-[#3c64f4]/10' : 'text-gray-700 cursor-not-allowed'}`}
                                                        title={postPreviewUrl || 'No preview available'}
                                                    >
                                                        <Eye className="w-[18px] h-[18px]" />
                                                    </button>
                                                    <Link
                                                        href={`/dashboard/blog/${post.id}`}
                                                        className="p-2 rounded-md bg-[#2d2d30]/50 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                    >
                                                        <Edit2 className="w-[18px] h-[18px]" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(post.id)}
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
                {processedPosts.length > 0 && (
                    <div className="border-t border-[#2d2d30] p-4 bg-[#212124]">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    </div>
                )}
            </div>

            {/* Live Preview Drawer */}
            {isPreviewOpen && previewUrl && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-[2px] transition-opacity">
                    <div className="w-full md:w-[85%] max-w-5xl h-full bg-[#1c1c1f] shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0">
                        <div className="flex items-center justify-between p-4 border-b border-[#2d2d30] bg-[#212124]">
                            <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-[#3c64f4]" />
                                <div>
                                    <h2 className="text-sm font-bold text-white leading-tight">Live Preview</h2>
                                    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-[#3c64f4] transition-colors flex items-center gap-1">
                                        Open in new tab <LinkIcon className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsPreviewOpen(false)}
                                className="p-2 hover:bg-[#3e3e42] rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-white relative">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-none"
                                title="Live Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
