"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

interface Article {
    id: string;
    category?: string; // [NEW]
    translations: {
        en?: { title: string };
    };
    status: string;
    createdAt: any;
}

import Pagination from "@/components/dashboard/Pagination";

// ... existing imports

export default function ArticleListPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: keyof Article | 'title' | 'date'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc',
    });

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchArticles();
    }, []);

    // ... (fetch and delete logic same)

    const fetchArticles = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "articles"));
            const articleData: Article[] = [];
            querySnapshot.forEach((doc) => {
                articleData.push({ id: doc.id, ...doc.data() } as Article);
            });
            setArticles(articleData);
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this article?")) {
            try {
                await deleteDoc(doc(db, "articles", id));
                fetchArticles(); // Refresh list
            } catch (error) {
                console.error("Error deleting article:", error);
            }
        }
    };

    // Sort Handler
    const requestSort = (key: keyof Article | 'title' | 'date') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter & Sort Logic
    let processedArticles = [...articles];

    // 1. Filter
    processedArticles = processedArticles.filter(article => {
        const query = searchQuery.toLowerCase();
        const titleMatch = article.translations?.en?.title?.toLowerCase().includes(query);
        const categoryMatch = article.category?.toLowerCase().includes(query);
        return titleMatch || categoryMatch;
    });

    // 2. Sort
    processedArticles.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA: any = '';
        let valueB: any = '';

        if (key === 'title') {
            valueA = a.translations?.en?.title || '';
            valueB = b.translations?.en?.title || '';
        } else if (key === 'category') {
            valueA = a.category || '';
            valueB = b.category || '';
        } else if (key === 'status') {
            valueA = a.status || '';
            valueB = b.status || '';
        } else if (key === 'date') { // createdAt
            // Handle Firestore Timestamp or Date object or null
            const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
            const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
            valueA = dateA.getTime();
            valueB = dateB.getTime();
        }

        if (typeof valueA === 'string') {
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
    const totalPages = Math.ceil(processedArticles.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentArticles = processedArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
                <svg className="w-3 h-3 ml-1 text-gray-400 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
            );
        }
        return sortConfig.direction === 'asc' ? (
            <svg className="w-3 h-3 ml-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
        ) : (
            <svg className="w-3 h-3 ml-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        );
    };

    if (loading) return <div className="p-6">Loading articles...</div>;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
                <Link
                    href="/dashboard/articles/new"
                    className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                    Create New Article
                </Link>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                        placeholder="Search by title or category"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100"
                                    onClick={() => requestSort('title')}
                                >
                                    <div className="flex items-center">
                                        Title (EN)
                                        {getSortIcon('title')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100"
                                    onClick={() => requestSort('category')}
                                >
                                    <div className="flex items-center">
                                        Category
                                        {getSortIcon('category')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer group hover:bg-gray-100"
                                    onClick={() => requestSort('status')}
                                >
                                    <div className="flex items-center">
                                        Status
                                        {getSortIcon('status')}
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentArticles.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        No articles found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentArticles.map((article) => (
                                    <tr key={article.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {article.translations?.en?.title || "Untitled"}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {article.createdAt?.seconds ? new Date(article.createdAt.seconds * 1000).toLocaleDateString() : 'No date'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {article.category || "-"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {article.status || "Published"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                href={`/dashboard/articles/${article.id}`}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                            >
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(article.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {processedArticles.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    );
}
