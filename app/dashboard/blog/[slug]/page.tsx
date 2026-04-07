"use client";

import { useEffect, useState, useRef } from "react";

const BLOG_CATEGORIES = [
    "Real Estate Tips in Dubai",
    "Real Estate Tips in Abu Dhabi",
    "UAE Real Estate",
    "UAE Real Estate Trends",
    "Dubai Real Estate",
    "Abu Dhabi Real Estate",
    "Ras Al Khaimah Real Estate",
    "Sharjah Real Estate",
    "New Project Launch in Abu Dhabi",
    "New Project Launch in Dubai",
    "New Project Launch in Ras Al Khaimah",
    "New Project Launch in Sharjah"
];
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import { Eye, Save, RefreshCw, Link as LinkIcon, Languages, X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

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
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

    // AI States
    const [isAiSectionOpen, setIsAiSectionOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [generatingAi, setGeneratingAi] = useState(false);

    // Preview
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const categoryRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    const handleGenerateAi = async () => {
        if (!aiPrompt.trim()) {
            alert("Please enter a prompt first.");
            return;
        }

        setGeneratingAi(true);
        try {
            const res = await fetch("/api/generate-blog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to generate AI content");
            }

            setFormData(prev => {
                const newTitle = data.title || prev.title;
                const newSlug = isNew ? slugify(newTitle) : prev.slug;

                return {
                    ...prev,
                    title: newTitle,
                    slug: newSlug,
                    id: isNew ? newSlug : prev.id,
                    summary: data.summary || prev.summary,
                    contentHtml: data.contentHtml || prev.contentHtml,
                };
            });
        } catch (error: any) {
            console.error("AI Generation error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setGeneratingAi(false);
        }
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

            router.push(`/dashboard/blog/${formData.slug}`);
        } catch (error) {
            console.error("Error saving post:", error);
            alert("Failed to save post");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-400">Loading editor...</div>;

    const previewUrl = formData.slug ? `https://www.psinv.net/en/blog/${formData.slug}` : "";
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
                    <button
                        type="button"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3c64f4] text-[#3c64f4] transition-colors text-sm font-medium ${!formData.slug
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[#3c64f4]/10'
                            }`}
                        onClick={() => {
                            if (formData.slug) {
                                setIsPreviewOpen(true);
                            }
                        }}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>
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

            {/* AI Generation Area */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setIsAiSectionOpen(!isAiSectionOpen)}
                    className="w-full flex items-center justify-between p-6 hover:bg-[#2d2d30]/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#3c64f4]/10 rounded-lg text-[#3c64f4]">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-white">
                                AI Content Generator
                            </h2>
                            <p className="text-sm text-gray-400 mt-1">Generate title, summary, and content automatically</p>
                        </div>
                    </div>
                    <div className="text-gray-400">
                        {isAiSectionOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                </button>

                {isAiSectionOpen && (
                    <div className="px-6 pb-6 space-y-4 border-t border-[#2d2d30] pt-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Prompt</label>
                            <textarea
                                rows={3}
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g. Write a blog about the top 5 areas to invest in Dubai real estate in 2026..."
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled={generatingAi}
                                onClick={handleGenerateAi}
                                className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#3c64f4] text-white hover:bg-[#2b4ac0] transition-colors disabled:opacity-50 text-sm font-medium shadow-[0_0_15px_rgba(60,100,244,0.3)]"
                            >
                                {generatingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {generatingAi ? "Generating..." : "Generate with AI"}
                            </button>
                        </div>
                    </div>
                )}
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
                        <div ref={categoryRef} className="relative">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Category</label>
                            <input
                                type="text"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.category}
                                onChange={handleCategoryChange}
                                onFocus={() => setIsCategoryDropdownOpen(true)}
                                placeholder="Search or select category..."
                            />
                            {isCategoryDropdownOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-[#1c1c1f] border border-[#3e3e42] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {BLOG_CATEGORIES.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).map(cat => (
                                        <div
                                            key={cat}
                                            className="px-4 py-2 text-sm text-gray-200 hover:bg-[#3e3e42] cursor-pointer transition-colors"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    category: cat,
                                                    categoryKey: slugify(cat)
                                                }));
                                                setIsCategoryDropdownOpen(false);
                                            }}
                                        >
                                            {cat}
                                        </div>
                                    ))}
                                    {BLOG_CATEGORIES.filter(c => c.toLowerCase().includes(formData.category.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-2 text-sm text-gray-500">
                                            No matches found
                                        </div>
                                    )}
                                </div>
                            )}
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

            {/* Live Preview Drawer */}
            {isPreviewOpen && (
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
                                type="button"
                                onClick={() => setIsPreviewOpen(false)}
                                className="p-2 hover:bg-[#3e3e42] rounded-lg text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-white relative">
                            {/* Loading skeleton for iframe if needed, but standard is fine */}
                            <iframe 
                                src={previewUrl} 
                                className="w-full h-full border-none"
                                title="Live Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
