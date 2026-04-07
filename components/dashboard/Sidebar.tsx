import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (val: boolean) => void }) {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const effectivelyCollapsed = isCollapsed && !isHovered;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                console.log(docSnap.data());
                if (docSnap.exists()) {
                    setUserRole(docSnap.data().role || null);
                }
            } else {
                setUserRole(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const navItems = [
        {
            name: "Dashboard", href: "/dashboard", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            )
        },
        {
            name: "Article", href: "/dashboard/articles", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            )
        },
        {
            name: "Blog", href: "/dashboard/blog", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            )
        },
        {
            name: "Banners", href: "/dashboard/banners", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )
        }
    ];

    if (userRole === "SuperAdmin") {
        navItems.push({
            name: "Users", href: "/dashboard/users", icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )
        });
    }

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`fixed inset-y-0 left-0 z-10 bg-[#232326] border-r border-[#2d2d30] hidden md:flex md:flex-col shadow-xl transition-all duration-300 z-100 ${effectivelyCollapsed ? 'w-20' : 'w-64'}`}
        >
            <div className="flex items-center justify-center h-16 border-b border-[#2d2d30] bg-[#1c1c1f]">
                <div className="flex items-center justify-center w-full px-4 gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-[#3c64f4] rounded-lg text-white font-bold text-lg shrink-0">
                        P
                    </div>
                    {!effectivelyCollapsed && <span className="text-xl font-bold text-white tracking-wider whitespace-nowrap overflow-hidden transition-all duration-300">CMS ADMIN</span>}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="px-4 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={effectivelyCollapsed ? item.name : undefined}
                                className={`flex items-center ${effectivelyCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-all duration-200 group border ${isActive
                                    ? "bg-[#28324a] text-[#3c64f4] border-[#303f5e]"
                                    : "border-transparent text-gray-400 hover:bg-[#2d2d30]/50 hover:text-gray-200"
                                    }`}
                            >
                                <div className={`flex-shrink-0 ${isActive ? "text-[#3c64f4]" : "text-gray-500 group-hover:text-gray-400"}`}>
                                    {item.icon}
                                </div>
                                {!effectivelyCollapsed && <span className="ml-3 whitespace-nowrap overflow-hidden">{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t border-[#2d2d30] flex flex-col gap-2">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center ${effectivelyCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-sm font-medium text-gray-400 rounded-lg hover:bg-[#2d2d30]/50 hover:text-gray-200 transition-colors cursor-pointer border border-transparent w-full`}
                    title={effectivelyCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className="flex-shrink-0">
                        {effectivelyCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronLeft className="w-5 h-5 text-gray-500" />}
                    </div>
                    {!effectivelyCollapsed && <span className="ml-3 whitespace-nowrap overflow-hidden">Collapse</span>}
                </button>
                <div className={`hidden flex items-center ${effectivelyCollapsed ? 'justify-center px-0' : 'px-4'} py-3 text-sm font-medium text-gray-400 rounded-lg hover:bg-[#2d2d30]/50 hover:text-gray-200 transition-colors cursor-pointer border border-transparent`} title={effectivelyCollapsed ? "Help & Support" : undefined}>
                    <svg className="w-5 h-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {!effectivelyCollapsed && <span className="ml-3 whitespace-nowrap overflow-hidden">Help & Support</span>}
                </div>
            </div>
        </aside>
    );
}
