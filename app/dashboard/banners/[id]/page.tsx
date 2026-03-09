"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { Eye, Save, X, Image as ImageIcon, Video as VideoIcon, LayoutTemplate } from "lucide-react";

interface BannerData {
    id: string;
    title: string;
    subTitle: string;
    shortDescription: string;
    imageBannerUrl: string;
    videoBannerUrl: string;
    featured: boolean;
    landingPageUrl: string;
    iconUrl: string;
    city: string; // Add city field
    createdAt?: any;
    updatedAt?: any;
}

export default function BannerEditorPage() {
    const routeParams = useParams();
    const idParam = routeParams.id as string;
    const isNew = idParam === "new";

    const router = useRouter();
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Independent upload states for different media types
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingVideo, setUploadingVideo] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);

    const [formData, setFormData] = useState<BannerData>({
        id: "",
        title: "",
        subTitle: "",
        shortDescription: "",
        imageBannerUrl: "",
        videoBannerUrl: "",
        featured: false,
        landingPageUrl: "",
        iconUrl: "",
        city: "", // Initialize city
    });

    useEffect(() => {
        if (!isNew && idParam) {
            fetchBanner(idParam);
        }
    }, [idParam, isNew]);

    const fetchBanner = async (docId: string) => {
        try {
            const docRef = doc(db, "banners", docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as BannerData;
                setFormData({
                    ...data,
                    id: docId
                });
            } else {
                alert("Banner not found");
                router.push("/dashboard/banners");
            }
        } catch (error) {
            console.error("Error fetching banner:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMediaUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'image' | 'video' | 'icon',
        folder: string
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Set specific upload state
        if (type === 'image') setUploadingImage(true);
        if (type === 'video') setUploadingVideo(true);
        if (type === 'icon') setUploadingIcon(true);

        try {
            const storageRef = ref(storage, `banners/${folder}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setFormData(prev => ({
                ...prev,
                ...(type === 'image' && { imageBannerUrl: downloadURL }),
                ...(type === 'video' && { videoBannerUrl: downloadURL }),
                ...(type === 'icon' && { iconUrl: downloadURL }),
            }));
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            alert(`Failed to upload ${type}.`);
        } finally {
            if (type === 'image') setUploadingImage(false);
            if (type === 'video') setUploadingVideo(false);
            if (type === 'icon') setUploadingIcon(false);
        }
    };

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        const newId = slugify(title);

        setFormData(prev => {
            const updates: Partial<BannerData> = { title };
            if (isNew && (!prev.id || prev.id === slugify(prev.title))) {
                updates.id = newId;
            }
            return { ...prev, ...updates };
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.id) {
            alert("Identifier is required");
            return;
        }

        setSaving(true);
        try {
            const docId = formData.id;
            const isFeatured = formData.featured;

            // If setting this banner to featured, we must ensure no others are featured (Optional business logic: usually there is only 1 featured)
            if (isFeatured) {
                const q = query(collection(db, "banners"), where("featured", "==", true));
                const querySnapshot = await getDocs(q);

                // Batch updates in a real app, but for simplicity here we just update them sequentially
                const unfeaturePromises = querySnapshot.docs.map(bannerDoc => {
                    if (bannerDoc.id !== docId) {
                        return setDoc(doc(db, "banners", bannerDoc.id), { featured: false }, { merge: true });
                    }
                });
                await Promise.all(unfeaturePromises);
            }

            const payloadData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isNew) {
                (payloadData as any).createdAt = serverTimestamp();
            }

            // Save the document
            await setDoc(doc(db, "banners", docId), payloadData, { merge: true });

            router.push("/dashboard/banners");
        } catch (error) {
            console.error("Error saving banner:", error);
            alert("Failed to save banner");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-400">Loading editor...</div>;

    const currentTitle = formData.title || (isNew ? "New Banner" : "Edit Banner");
    const isUploadingAny = uploadingImage || uploadingVideo || uploadingIcon;

    return (
        <form onSubmit={handleSave} className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#10b981]">
                        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        Connected
                    </div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight flex items-center gap-3">
                        <LayoutTemplate className="w-7 h-7 text-[#3c64f4]" />
                        {currentTitle}
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
                        disabled={saving || isUploadingAny}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#3c64f4] text-white hover:bg-[#2b4ac0] transition-colors disabled:opacity-50 text-sm font-medium shadow-[0_0_15px_rgba(60,100,244,0.3)]"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Banner"}
                    </button>
                </div>
            </div>

            {/* Main Content split into 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Text & Content Details */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-white mb-8">Base Information</h2>

                        <div className="space-y-6">
                            {/* Title & Document ID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Main Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                        value={formData.title}
                                        onChange={handleTitleChange}
                                        placeholder="e.g. Find Your Dream Home"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Document ID</span>
                                        {isNew && <span className="text-[#3c64f4] capitalize tracking-normal font-normal text-xs">Auto-generated</span>}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!isNew} // Lock ID if not new to prevent orphaned docs unless explicitly handled via delete/create
                                        className={`w-full border rounded-lg px-4 py-3 text-sm font-mono transition-colors ${isNew
                                            ? "bg-[#1c1c1f] border-[#3e3e42] text-gray-400 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4]"
                                            : "bg-[#1c1c1f]/50 border-[#3e3e42]/50 text-gray-500 cursor-not-allowed"
                                            }`}
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: slugify(e.target.value) })}
                                    />
                                    {!isNew && <p className="text-xs text-gray-600 mt-1">ID cannot be changed after creation.</p>}
                                </div>
                            </div>

                            {/* Subtitle */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Sub Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                        value={formData.subTitle}
                                        onChange={(e) => setFormData(prev => ({ ...prev, subTitle: e.target.value }))}
                                        placeholder="e.g. Exclusive Properties"
                                    />
                                </div>
                                {/* City */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">City Focus</label>
                                    <select
                                        className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors appearance-none"
                                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                                        value={formData.city}
                                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    >
                                        <option value="">Global / All Cities</option>
                                        <option value="Abu Dhabi">Abu Dhabi</option>
                                        <option value="Dubai">Dubai</option>
                                        <option value="Rak">Rak</option>
                                        <option value="Sharjah">Sharjah</option>
                                        <option value="Al Ain">Al Ain</option>
                                    </select>
                                </div>
                            </div>

                            {/* URL Landing Page */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">URL Landing Page</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                    value={formData.landingPageUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, landingPageUrl: e.target.value }))}
                                    placeholder="e.g. /properties/dubai or https://example.com"
                                />
                            </div>

                            {/* Short Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Short Description</label>
                                <textarea
                                    className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors min-h-[120px]"
                                    value={formData.shortDescription}
                                    onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                                    placeholder="Brief overview text for the banner..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Media & Settings */}
                <div className="space-y-8">

                    {/* Settings Block */}
                    <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
                        <div className="flex items-center justify-between p-4 bg-[#1c1c1f] border border-[#3e3e42] rounded-lg">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-200 mb-1">Featured Banner</h3>
                                <p className="text-xs text-gray-500 max-w-[200px]">Set this banner as the primary active banner on the site.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.featured}
                                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                                />
                                <div className="w-11 h-6 bg-[#2d2d30] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3c64f4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
                            </label>
                        </div>
                    </div>

                    {/* Media Block */}
                    <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                        <h2 className="text-xl font-bold text-white mb-8">Media Assets</h2>

                        <div className="space-y-8">

                            {/* Image Banner */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                                    <span>Image Banner (Desktop)</span>
                                    <ImageIcon className="w-4 h-4 text-gray-500" />
                                </label>
                                {formData.imageBannerUrl ? (
                                    <div className="relative group mb-3 rounded-xl overflow-hidden border border-[#3e3e42] bg-[#1c1c1f]">
                                        <img src={formData.imageBannerUrl} alt="Banner" className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, imageBannerUrl: "" }))}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-32 mb-3 rounded-xl border-2 border-dashed border-[#3e3e42] bg-[#1c1c1f] flex flex-col items-center justify-center text-gray-500">
                                        <ImageIcon className="w-6 h-6 mb-2 text-[#3e3e42]" />
                                        <span className="text-xs">No image selected</span>
                                    </div>
                                )}
                                <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg text-sm font-medium text-gray-200 hover:bg-[#3e3e42] transition-colors relative overflow-hidden">
                                    <span className={uploadingImage ? 'opacity-0' : 'opacity-100 transition-opacity'}>Upload Image</span>
                                    {uploadingImage && <span className="absolute text-[#3c64f4]">Uploading...</span>}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, 'image', 'images')} disabled={uploadingImage} />
                                </label>
                            </div>

                            {/* Video Banner */}
                            <div className="pt-6 border-t border-[#3e3e42]">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center justify-between">
                                    <span>Video Banner (Auto-play)</span>
                                    <VideoIcon className="w-4 h-4 text-gray-500" />
                                </label>
                                {formData.videoBannerUrl ? (
                                    <div className="relative group mb-3 rounded-xl overflow-hidden border border-[#3e3e42] bg-[#1c1c1f]">
                                        <video src={formData.videoBannerUrl} className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted loop playsInline controls />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, videoBannerUrl: "" }))}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-32 mb-3 rounded-xl border-2 border-dashed border-[#3e3e42] bg-[#1c1c1f] flex flex-col items-center justify-center text-gray-500">
                                        <VideoIcon className="w-6 h-6 mb-2 text-[#3e3e42]" />
                                        <span className="text-xs">No video selected (.mp4)</span>
                                    </div>
                                )}
                                <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg text-sm font-medium text-gray-200 hover:bg-[#3e3e42] transition-colors relative overflow-hidden">
                                    <span className={uploadingVideo ? 'opacity-0' : 'opacity-100 transition-opacity'}>Upload Video</span>
                                    {uploadingVideo && <span className="absolute text-[#eab308]">Uploading...</span>}
                                    <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => handleMediaUpload(e, 'video', 'videos')} disabled={uploadingVideo} />
                                </label>
                            </div>

                            {/* Icon */}
                            <div className="pt-6 border-t border-[#3e3e42]">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">
                                    Decorative Icon (SVG/PNG)
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl border border-[#3e3e42] bg-[#1c1c1f] flex items-center justify-center overflow-hidden">
                                        {formData.iconUrl ? (
                                            <img src={formData.iconUrl} alt="Icon" className="w-10 h-10 object-contain" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-[#3e3e42] border-dashed"></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="cursor-pointer flex items-center justify-center w-full px-4 py-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg text-sm font-medium text-gray-200 hover:bg-[#3e3e42] transition-colors relative overflow-hidden mb-2">
                                            <span className={uploadingIcon ? 'opacity-0' : 'opacity-100 transition-opacity'}>Upload Icon</span>
                                            {uploadingIcon && <span className="absolute text-[#3c64f4]">Wait...</span>}
                                            <input type="file" accept="image/png,image/svg+xml" className="hidden" onChange={(e) => handleMediaUpload(e, 'icon', 'icons')} disabled={uploadingIcon} />
                                        </label>
                                        {formData.iconUrl && (
                                            <button type="button" onClick={() => setFormData(prev => ({ ...prev, iconUrl: "" }))} className="text-xs text-red-400 hover:text-red-300 block w-full text-center">
                                                Remove Icon
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </form>
    );
}
