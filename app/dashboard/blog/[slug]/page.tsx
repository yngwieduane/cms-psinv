"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import { Eye, Save, RefreshCw, Link as LinkIcon, Languages, X } from "lucide-react";

interface BlogPostData {
    author: string;
    category: string;
    categoryKey: string;
    contentHtml: string;
    date: string;
    id: string; // redundant, same as slug
    imageUrl: string;
    gallery?: string[];
    youtubeUrl?: string;
    lastSyncedAt: any;
    slug: string; // Document ID
    summary: string;
    title: string;
}

export default function BlogEditorPage() {
    const routeParams = useParams();
    const slugParam = routeParams.slug as string;
    const isNew = slugParam === "new";

    const router = useRouter();
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState<BlogPostData>({
        author: "",
        category: "",
        categoryKey: "",
        contentHtml: "",
        date: new Date().toISOString().split('T')[0], // Default to today YYYY-MM-DD
        id: "",
        imageUrl: "",
        gallery: [],
        youtubeUrl: "",
        lastSyncedAt: null,
        slug: "",
        summary: "",
        title: "",
    });

    useEffect(() => {
        if (!isNew && slugParam) {
            fetchPost(slugParam);
        }
    }, [slugParam, isNew]);

    const fetchPost = async (slugId: string) => {
        try {
            const docRef = doc(db, "blog_posts", slugId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as BlogPostData;
                setFormData({
                    ...data,
                    gallery: data.gallery || [],
                    youtubeUrl: data.youtubeUrl || "",
                });
            } else {
                alert("Post not found");
                router.push("/dashboard/blog");
            }
        } catch (error) {
            console.error("Error fetching post:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `blog/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const storageRef = ref(storage, `blog/gallery/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                return getDownloadURL(snapshot.ref);
            });

            const downloadURLs = await Promise.all(uploadPromises);

            setFormData(prev => ({
                ...prev,
                gallery: [...(prev.gallery || []), ...downloadURLs]
            }));
        } catch (error) {
            console.error("Error uploading gallery images:", error);
            alert("Failed to upload images.");
        } finally {
            setUploading(false);
        }
    };

    const removeGalleryImage = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            gallery: prev.gallery?.filter((_, index) => index !== indexToRemove)
        }));
    };

    // Helper to slugify text
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
        const newSlug = slugify(title);

        setFormData(prev => {
            const updates: Partial<BlogPostData> = { title };
            if (isNew && (!prev.slug || prev.slug === slugify(prev.title))) {
                updates.slug = newSlug;
                updates.id = newSlug;
            }
            return { ...prev, ...updates };
        });
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const category = e.target.value;
        setFormData(prev => ({
            ...prev,
            category,
            categoryKey: slugify(category) // Auto-gen categoryKey
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.slug) {
            alert("Slug is required");
            return;
        }

        setSaving(true);
        try {
            const docId = formData.slug;

            const postData = {
                ...formData,
                id: docId,
                lastSyncedAt: serverTimestamp(),
            };

            await setDoc(doc(db, "blog_posts", docId), postData, { merge: true });

            router.push("/dashboard/blog");
        } catch (error) {
            console.error("Error saving post:", error);
            alert("Failed to save post");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-400">Loading editor...</div>;

    const currentTitle = formData.title || (isNew ? "New Blog Post" : "Edit Blog Post");

    return (
        <form onSubmit={handleSave} className="p-6 max-w-6xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#10b981]">
                        <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        Connected
                    </div>
                    <h1 className="text-[28px] font-bold text-white tracking-tight">
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
                    <a
                        href={formData.slug ? `https://www.psinv.net/en/blog/${formData.slug}` : "#"}
                        target={formData.slug ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3c64f4] text-[#3c64f4] transition-colors text-sm font-medium ${!formData.slug
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-[#3c64f4]/10'
                            }`}
                        onClick={(e) => {
                            if (!formData.slug) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </a>
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#3c64f4] text-white hover:bg-[#2b4ac0] transition-colors disabled:opacity-50 text-sm font-medium shadow-[0_0_15px_rgba(60,100,244,0.3)]"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-white mb-8">
                    Post Details
                </h2>

                <div className="space-y-6">
                    {/* Title & Slug */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Title</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.title}
                                onChange={handleTitleChange}
                                placeholder="e.g. 5 Tips for First-Time Buyers"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Slug (ID)</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-400 font-mono focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value), id: slugify(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Author & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Author</label>
                            <input
                                type="text"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                            <input
                                type="date"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors [color-scheme:dark]"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Category & Category Key */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                            <input
                                type="text"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.category}
                                onChange={handleCategoryChange}
                                placeholder="e.g. Market Trends"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Category Key (Auto)</label>
                            <input
                                type="text"
                                readOnly
                                className="w-full bg-[#1c1c1f]/50 border border-[#3e3e42]/50 rounded-lg px-4 py-3 text-sm text-gray-500 cursor-not-allowed focus:outline-none transition-colors"
                                value={formData.categoryKey}
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Summary</label>
                        <textarea
                            rows={3}
                            className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        />
                    </div>

                    {/* Rich Content HTML */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Content HTML</label>
                        <div className="border border-[#3e3e42] rounded-lg overflow-hidden [&_.ql-toolbar]:bg-[#2d2d30] [&_.ql-toolbar]:border-b-[#3e3e42] [&_.ql-container]:bg-[#1c1c1f] [&_.ql-container]:text-gray-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[300px]">
                            <RichTextEditor
                                value={formData.contentHtml}
                                onChange={(value: string) => setFormData(prev => ({ ...prev, contentHtml: value }))}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Area */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-white mb-8">
                    Media
                </h2>

                <div className="space-y-8">
                    {/* Featured Image */}
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">Featured Image</label>
                        <div className="flex items-center gap-6">
                            {formData.imageUrl ? (
                                <img
                                    src={formData.imageUrl}
                                    alt="Preview"
                                    className="h-24 w-32 object-cover rounded-xl border border-[#3e3e42]"
                                />
                            ) : (
                                <div className="h-24 w-32 rounded-xl border border-dashed border-[#3e3e42] bg-[#1c1c1f] flex flex-col items-center justify-center text-gray-500">
                                    <span className="text-xs">No image</span>
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg text-sm font-medium text-gray-200 hover:bg-[#3e3e42] transition-colors">
                                    <span>Choose Image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                {uploading && <p className="text-sm text-[#3c64f4] mt-2">Uploading...</p>}
                            </div>
                        </div>
                    </div>

                    {/* YouTube URL */}
                    <div className="pt-6 border-t border-[#3e3e42]">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            YouTube Video URL
                        </label>
                        <input
                            type="text"
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                            value={formData.youtubeUrl || ""}
                            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        />
                    </div>

                    {/* Gallery Images */}
                    <div className="pt-6 border-t border-[#3e3e42]">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">
                            Image Gallery
                        </label>

                        {formData.gallery && formData.gallery.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                                {formData.gallery.map((imgUrl, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={imgUrl}
                                            alt={`Gallery ${index}`}
                                            className="h-24 w-full object-cover rounded-xl border border-[#3e3e42]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                            title="Remove Image"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#2d2d30] border border-[#3e3e42] rounded-lg text-sm font-medium text-gray-200 hover:bg-[#3e3e42] transition-colors">
                                <span>Upload Multiple Images</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleGalleryUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
