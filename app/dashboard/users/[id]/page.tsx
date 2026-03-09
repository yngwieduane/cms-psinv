"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Save, UserCog, CalendarIcon, Shield, Mail } from "lucide-react";

interface UserProfile {
    id: string;
    email: string;
    displayName: string;
    role: string;
    createdAt?: any;
    updatedAt?: any;
    recentlyViewed?: string;
    lastLogin?: any;
    photoURL?: string;
}

export default function UserEditorPage() {
    const routeParams = useParams();
    const idParam = routeParams.id as string;

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<UserProfile>({
        id: "",
        email: "",
        displayName: "",
        role: "Client",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().role === "SuperAdmin") {
                    if (idParam) {
                        fetchUser(idParam);
                    }
                } else {
                    router.push("/dashboard");
                }
            } else {
                router.push("/login");
            }
        });
        return () => unsubscribe();
    }, [idParam, router]);

    const fetchUser = async (docId: string) => {
        try {
            const docRef = doc(db, "users", docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    id: docId,
                    email: data.email || "",
                    displayName: data.displayName || data.name || "",
                    role: data.role || "Client",
                    createdAt: data.createdAt,
                    recentlyViewed: data.recentlyViewed || "Unknown",
                    lastLogin: data.lastLogin || "Unknown",
                    photoURL: data.photoURL,
                });
            } else {
                alert("User not found");
                router.push("/dashboard/users");
            }
        } catch (error) {
            console.error("Error fetching user:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const docId = formData.id;

            const payloadData = {
                displayName: formData.displayName,
                role: formData.role,
                updatedAt: serverTimestamp(),
            };

            await setDoc(doc(db, "users", docId), payloadData, { merge: true });
            router.push("/dashboard/users");
        } catch (error) {
            console.error("Error saving user:", error);
            alert("Failed to save user");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "—";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    if (loading) return <div className="p-6 text-gray-400">Loading user data...</div>;

    return (
        <form onSubmit={handleSave} className="p-6 max-w-4xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#10b981]">
                        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        Connected
                    </div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                        <UserCog className="w-7 h-7 text-[#3c64f4]" />
                        Edit User Profile
                    </h1>
                </div>

                <div className="flex items-center gap-3 pt-6 md:pt-0">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3e3e42] text-gray-300 bg-[#2d2d30]/50 hover:bg-[#3e3e42] transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#3c64f4] text-white hover:bg-[#2b4ac0] transition-colors disabled:opacity-50 text-sm font-medium shadow-[0_0_15px_rgba(60,100,244,0.3)]"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">

                {/* Profile Header Block */}
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[#3e3e42]">
                    <div className="w-20 h-20 rounded-full bg-[#1c1c1f] border-2 border-[#3e3e42] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {formData.photoURL ? (
                            <img src={formData.photoURL} alt={formData.displayName} className="w-full h-full object-cover" />
                        ) : (
                            <UserCog className="w-10 h-10 text-gray-500" />
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{formData.displayName || "Unknown User"}</h2>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {formData.email || "No Email"}</span>
                            <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4" /> Last Login {formatDate(formData.lastLogin)}</span>
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                <h3 className="text-lg font-bold text-white mb-6">User Details & Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Display Name */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Display Name</label>
                        <input
                            type="text"
                            className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            placeholder="User's full name"
                        />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
                            <span>Email Address</span>
                            <span className="text-[#eab308] tracking-normal font-normal normal-case">Read Only</span>
                        </label>
                        <input
                            type="email"
                            className="w-full bg-[#1c1c1f]/50 border border-[#3e3e42]/50 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                            value={formData.email}
                            disabled
                        />
                    </div>

                    {/* Recently Viewed (Read Only) */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex justify-between">
                            <span>Recently Viewed Page</span>
                            <span className="text-[#eab308] tracking-normal font-normal normal-case">Read Only</span>
                        </label>
                        <input
                            type="text"
                            className="w-full bg-[#1c1c1f]/50 border border-[#3e3e42]/50 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
                            value={formData.recentlyViewed || "Unknown"}
                            disabled
                        />
                    </div>

                    {/* Role */}
                    <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" />
                            System Role
                        </label>
                        <select
                            className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors appearance-none"
                            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="Client">Client</option>
                            <option value="Admin">Admin</option>
                            <option value="SuperAdmin">SuperAdmin</option>
                        </select>
                        <p className="mt-2 text-xs text-gray-500">
                            Changing a user's role will affect their access permissions across the CMS and application.
                        </p>
                    </div>

                </div>
            </div>
        </form>
    );
}
