import React from "react";

interface HeaderProps {
    userEmail?: string | null;
    onLogout: () => void;
}

export default function Header({ userEmail, onLogout }: HeaderProps) {
    return (
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 bg-[#1c1c1f]/80 backdrop-blur-md border-b border-[#2d2d30]">
            <div className="flex items-center w-full max-w-xl">
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="w-full py-2.5 pl-10 pr-4 text-sm text-gray-200 bg-[#111113] border border-[#2d2d30] rounded-lg focus:ring-1 focus:ring-[#3c64f4] focus:border-[#3c64f4] transition-colors placeholder:text-gray-500"
                        placeholder="Search..."
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <button className="relative p-2 text-gray-400 hover:text-gray-200 transition-colors">
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#3c64f4] rounded-full ring-2 ring-[#1c1c1f]"></span>
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                    </svg>
                </button>

                <div className="flex items-center space-x-3 border-l border-[#2d2d30] pl-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium text-gray-200">
                            {userEmail?.split("@")[0] || "User"}
                        </span>
                        <span className="text-xs text-gray-500">Admin</span>
                    </div>
                    <div className="relative group">
                        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2a385f] text-[#3c64f4] font-semibold ring-2 ring-[#1c1c1f] shadow-sm">
                            {userEmail ? userEmail[0].toUpperCase() : "U"}
                        </button>
                        {/* Simple Dropdown for Demo */}
                        <div className="absolute right-0 w-48 mt-2 origin-top-right bg-[#232326] border border-[#2d2d30] rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block hover:block">
                            <div className="py-1">
                                <button
                                    onClick={onLogout}
                                    className="block w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-[#2d2d30]"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
