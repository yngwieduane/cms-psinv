"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import Link from "next/link";

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

export default function BlogEditorPage({ params }: { params: Promise<{ slug: string }> }) {
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
                    // Ensure arrays are initialized if missing in DB
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
            // Auto update slug only if it matches previous auto-gen slug or is new/empty
            // Simple logic: if creating new, auto-fill slug. If editing, maybe keep as is unless explicit?
            // User requested explicit fields. Let's auto-fill slug for convenience if it's new.
            const updates: Partial<BlogPostData> = { title };
            if (isNew && (!prev.slug || prev.slug === slugify(prev.title))) {
                updates.slug = newSlug;
                updates.id = newSlug; // ID is redundant as per request
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
            // Document ID is the SLUG
            const docId = formData.slug;

            const postData = {
                ...formData,
                id: docId, // Ensure ID matches Slug
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

    if (loading) return <div className="p-6">Loading editor...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? "Create Blog Post" : "Edit Blog Post"}
                </h1>
                <Link
                    href="/dashboard/blog"
                    className="text-gray-600 hover:text-gray-900"
                >
                    Cancel
                </Link>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    {/* Title & Slug */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.title}
                                onChange={handleTitleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Slug (ID)</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-gray-900 bg-gray-50"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value), id: slugify(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Author & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Author</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Category & Category Key */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <input
                                type="text"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.category}
                                onChange={handleCategoryChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category Key (Auto)</label>
                            <input
                                type="text"
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
                                value={formData.categoryKey}
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Summary</label>
                        <textarea
                            rows={3}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                            value={formData.summary}
                            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                        />
                    </div>

                    {/* Image */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Featured Image</label>
                        <div className="mt-2 flex items-center gap-4">
                            {formData.imageUrl && (
                                <img
                                    src={formData.imageUrl}
                                    alt="Preview"
                                    className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                                />
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="block w-full text-sm text-gray-900
                                      file:mr-4 file:py-2 file:px-4
                                      file:rounded-full file:border-0
                                      file:text-sm file:font-semibold
                                      file:bg-indigo-50 file:text-indigo-700
                                      hover:file:bg-indigo-100
                                    "
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                />
                                {uploading && <p className="text-sm text-indigo-600 mt-1">Uploading...</p>}
                            </div>
                        </div>
                    </div>

                    {/* YouTube URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            YouTube URL
                        </label>
                        <input
                            type="text"
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                            value={formData.youtubeUrl || ""}
                            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                        />
                    </div>

                    {/* Gallery Images */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Image Gallery
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {formData.gallery?.map((imgUrl, index) => (
                                <div key={index} className="relative group">
                                    <img
                                        src={imgUrl}
                                        alt={`Gallery ${index}`}
                                        className="h-24 w-full object-cover rounded-lg border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryImage(index)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove Image"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="block w-full text-sm text-gray-900
                                  file:mr-4 file:py-2 file:px-4
                                  file:rounded-full file:border-0
                                  file:text-sm file:font-semibold
                                  file:bg-indigo-50 file:text-indigo-700
                                  hover:file:bg-indigo-100
                                "
                                onChange={handleGalleryUpload}
                                disabled={uploading}
                            />
                            <p className="mt-1 text-xs text-gray-500">Select multiple images to add to the gallery.</p>
                        </div>
                    </div>
                </div>

                {/* Rich Content */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content HTML</label>
                    <RichTextEditor
                        value={formData.contentHtml}
                        onChange={(value: string) => setFormData(prev => ({ ...prev, contentHtml: value }))}
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="px-8 py-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 shadow-sm font-medium transition-colors cursor-pointer"
                    >
                        {saving ? "Saving..." : "Save Blog Post"}
                    </button>
                </div>
            </form>
        </div>
    );
}
