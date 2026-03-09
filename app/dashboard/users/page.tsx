"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { sendPasswordResetEmail, onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Edit2, Key, User, Shield, CalendarIcon } from "lucide-react";
import Pagination from "@/components/dashboard/Pagination";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role?: string;
    createdAt?: any;
    lastLogin?: any;
    photoURL?: string;
    [key: string]: any;
}

export default function UsersListPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: keyof UserProfile; direction: 'asc' | 'desc' }>({
        key: 'lastLogin',
        direction: 'desc',
    });

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().role === "SuperAdmin") {
                    fetchUsers();
                } else {
                    router.push("/dashboard");
                }
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const items: UserProfile[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                items.push({
                    id: docSnap.id,
                    email: data.email || "No Email",
                    displayName: data.displayName || data.name || "Unknown User",
                    role: data.role || "Client",
                    createdAt: data.createdAt,
                    lastLogin: data.lastLogin,
                    photoURL: data.photoURL || null,
                } as UserProfile);
            });
            setUsers(items);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!email || email === "No Email") {
            alert("This user does not have a valid email address.");
            return;
        }
        if (confirm(`Are you sure you want to send a password reset email to ${email}?`)) {
            try {
                await sendPasswordResetEmail(auth, email);
                alert(`Password reset email sent to ${email}`);
            } catch (error: any) {
                console.error("Error sending password reset email:", error);
                alert(`Failed to send reset email: ${error.message}`);
            }
        }
    };

    // Sort Handler
    const requestSort = (key: keyof UserProfile) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter & Sort Logic
    let processedUsers = [...users];

    // 1. Filter
    processedUsers = processedUsers.filter(user => {
        const query = searchQuery.toLowerCase();
        const emailMatch = user.email?.toLowerCase().includes(query);
        const nameMatch = user.displayName?.toLowerCase().includes(query);
        return emailMatch || nameMatch;
    });

    // 2. Sort
    processedUsers.sort((a, b) => {
        const { key, direction } = sortConfig;
        let valueA: any = a[key];
        let valueB: any = b[key];

        if (key === 'createdAt' || key === 'lastLogin') {
            const dateA = valueA?.toMillis ? valueA.toMillis() : (valueA ? new Date(valueA).getTime() : 0);
            const dateB = valueB?.toMillis ? valueB.toMillis() : (valueB ? new Date(valueB).getTime() : 0);
            valueA = dateA;
            valueB = dateB;

            // For numbers (timestamps), direct comparison
            if (valueA < valueB) return direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return direction === 'asc' ? 1 : -1;
            return 0;
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
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
    const totalPages = Math.ceil(processedUsers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentItems = processedUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "—";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        }).format(date);
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
                    <h1 className="text-[28px] font-bold text-white mb-2">Users Directory</h1>
                    <p className="text-[15px] text-gray-400">
                        View and manage the users in your database collection.
                    </p>
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
                            placeholder="Search users by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                        <thead>
                            <tr className="border-b border-[#2d2d30]">
                                <th
                                    className="w-[35%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('displayName')}
                                >
                                    <div className="flex items-center">
                                        USER {getSortIcon('displayName')}
                                    </div>
                                </th>
                                <th
                                    className="w-[20%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('role')}
                                >
                                    <div className="flex items-center">
                                        ROLE {getSortIcon('role')}
                                    </div>
                                </th>
                                <th
                                    className="w-[25%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider cursor-pointer group hover:text-gray-400 transition-colors"
                                    onClick={() => requestSort('lastLogin')}
                                >
                                    <div className="flex items-center">
                                        LAST LOGIN {getSortIcon('lastLogin')}
                                    </div>
                                </th>
                                <th className="w-[20%] px-6 py-4 text-[11px] font-bold text-gray-500 tracking-wider text-right">
                                    ACTIONS
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2d2d30]/60">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 text-[14px]">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#28282c] transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap overflow-hidden">
                                            <div className="flex items-center gap-3 w-full pr-4">
                                                <div className="w-10 h-10 rounded-full bg-[#1c1c1f] border border-[#3e3e42] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </div>
                                                <div className="truncate flex-1">
                                                    <div
                                                        className="text-[14px] font-semibold text-gray-200 truncate"
                                                        title={user.displayName}
                                                    >
                                                        {user.displayName}
                                                    </div>
                                                    <div
                                                        className="text-[12px] text-gray-500 truncate"
                                                        title={user.email}
                                                    >
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap overflow-hidden">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3c64f4]/10 text-[#3c64f4] text-[12px] font-medium border border-[#3c64f4]/20">
                                                <Shield className="w-3.5 h-3.5" />
                                                <span className="capitalize">{user.role}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap overflow-hidden text-[14px] text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon className="w-4 h-4 text-gray-500" />
                                                {formatDate(user.lastLogin)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleResetPassword(user.email)}
                                                    title="Send Password Reset Email"
                                                    className="p-2 rounded-md bg-[#2d2d30]/50 text-gray-400 hover:text-[#eab308] hover:bg-[#eab308]/10 transition-colors"
                                                >
                                                    <Key className="w-[18px] h-[18px]" />
                                                </button>
                                                <Link
                                                    href={`/dashboard/users/${user.id}`}
                                                    title="Edit User Role"
                                                    className="p-2 rounded-md bg-[#2d2d30]/50 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                >
                                                    <Edit2 className="w-[18px] h-[18px]" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {processedUsers.length > 0 && (
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
