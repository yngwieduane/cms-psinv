"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";

interface BlogPost {
    id: string; // Document ID (which is the slug)
    title: string;
    author: string;
    category?: string;
    date: string;
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
                    date: data.date
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
                {/* Search Bar */}
                <div className="p-4 border-b border-[#2d2d30]">
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
                                    onClick={() => requestSort('date')}
                                >
                                    <div className="flex items-center">
                                        DATE {getSortIcon('date')}
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
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-[14px]">
                                        No blog posts found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentPosts.map((post) => (
                                    <tr key={post.id} className="hover:bg-[#28282c] transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="text-[14px] font-semibold text-gray-200">
                                                {post.title || "Untitled"}
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
                                        <td className="px-6 py-5 whitespace-nowrap text-[14px] text-gray-400">
                                            {post.date || "—"}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
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
                                ))
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
        </div>
    );
}
