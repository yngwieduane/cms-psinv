"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, addDoc, deleteDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard/RichTextEditor";

interface Translation {
    title: string;
    h2: string;
    h3: string;
    content: string;
}

interface ArticleData {
    image: string;
    gallery?: string[];
    youtubeUrl?: string; // e.g. https://www.youtube.com/embed/... or full watch link (we might want to parse it, but for now just storing)
    slug: string;
    category: string;
    city?: string;
    translations: {
        [key: string]: Translation;
    };
}

const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ar", label: "Arabic" },
    { code: "zh", label: "Chinese" },
    { code: "ru", label: "Russian" },
    { code: "nl", label: "Dutch" },
];

const CATEGORIES = [
    "UAE Real Estate Trends",
    "Real Estate Tips and Advice",
    "Rules and Regulations",
    "Laws",
    "Technology",
    "Property Guide",
    "Area Guide",
];

const CITIES = [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ras Al Khaimah",
    "Al Ain",
    "Umm Al Quwain",
];

export default function ArticleEditorPage({ params }: { params: Promise<{ articleId: string }> }) {
    const routeParams = useParams();
    const articleId = routeParams.articleId as string;

    const isNew = articleId === "new";
    const router = useRouter();
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState("en");

    const [formData, setFormData] = useState<ArticleData>({
        image: "",
        gallery: [],
        youtubeUrl: "",
        slug: "",
        category: "",
        city: "",
        translations: {
            en: { title: "", h2: "", h3: "", content: "" },
            ar: { title: "", h2: "", h3: "", content: "" },
            zh: { title: "", h2: "", h3: "", content: "" },
            ru: { title: "", h2: "", h3: "", content: "" },
            nl: { title: "", h2: "", h3: "", content: "" },
        },
    });

    useEffect(() => {
        if (!isNew && articleId) {
            fetchArticle(articleId);
        }
    }, [articleId, isNew]);

    const fetchArticle = async (id: string) => {
        try {
            const docRef = doc(db, "articles", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as ArticleData;
                // If fetching old data that has 'description', mapping might be needed if strict,
                // but since this is a new field name, old data 'description' won't map to 'content' automatically
                // unless we migrate or map it here. Assuming new data or willing to lose old description reference in UI.
                // To be safe, let's allow a fallback or just proceed with new field.
                // Given the instructions, I'll assume direct mapping.
                setFormData((prev) => ({
                    ...prev,
                    ...data,
                    // Ensure arrays are initialized if missing in DB
                    gallery: data.gallery || [],
                    youtubeUrl: data.youtubeUrl || "",
                    translations: { ...prev.translations, ...data.translations },
                }));
            } else {
                alert("Article not found");
                router.push("/dashboard/articles");
            }
        } catch (error) {
            console.error("Error fetching article:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `articles/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setFormData(prev => ({ ...prev, image: downloadURL }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Make sure Firebase Storage is enabled.");
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
                const storageRef = ref(storage, `articles/gallery/${Date.now()}_${file.name}`);
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

    // Auto-generate slug from English title
    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w\-]+/g, '') // Remove all non-word chars
            .replace(/\-\-+/g, '-');  // Replace multiple - with single -
    };

    const handleTranslationChange = (
        field: keyof Translation,
        value: string
    ) => {
        setFormData((prev) => {
            const newState = {
                ...prev,
                translations: {
                    ...prev.translations,
                    [activeTab]: {
                        ...prev.translations[activeTab],
                        [field]: value,
                    },
                },
            };

            // Auto-update slug if English title changes and slug is empty or was auto-generated
            if (activeTab === 'en' && field === 'title') {
                const currentSlugified = slugify(prev.translations.en.title);
                const newSlug = slugify(value);

                // If the slug field is strictly equal to the slugified English title (or empty), update it.
                // This allows manual override: if user changes slug to custom, we stop auto-updating.
                if (prev.slug === currentSlugified || prev.slug === "") {
                    newState.slug = newSlug;
                }
            }

            return newState;
        });
    };

    const checkSlugUnique = async (slug: string) => {
        // Query must be against a collection-indexed field. Ensure "slug" is indexed if using composite queries, but for simple equality it's fine.
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return true;

        // If found, check if it's the SAME article (for edits)
        let isUnique = true;
        querySnapshot.forEach((doc) => {
            if (doc.id !== articleId) {
                isUnique = false;
            }
        });
        return isUnique;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.slug) {
            alert("Slug is required");
            return;
        }

        setSaving(true);
        try {
            // Check uniqueness
            const isUnique = await checkSlugUnique(formData.slug);
            if (!isUnique) {
                alert("This slug is already taken. Please change the title or the slug manually.");
                setSaving(false);
                return;
            }

            const articleData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isNew) {
                // Use slug as Document ID for new articles
                await setDoc(doc(db, "articles", formData.slug), {
                    ...articleData,
                    createdAt: serverTimestamp(),
                    status: "published",
                });
            } else {
                if (articleId !== formData.slug) {
                    // Slug changed: create new doc, delete old
                    await setDoc(doc(db, "articles", formData.slug), articleData);
                    await deleteDoc(doc(db, "articles", articleId));
                } else {
                    // Slug same: update existing
                    await setDoc(doc(db, "articles", articleId), articleData, { merge: true });
                }
            }
            router.push("/dashboard/articles");
        } catch (error) {
            console.error("Error saving article:", error);
            alert("Failed to save article");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading editor...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isNew ? "Create Article" : "Edit Article"}
                </h1>
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Shared Fields */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        General Information
                    </h2>

                    {/* Slug Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Slug (Unique URL Identifier)
                        </label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 font-mono bg-gray-50"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                        />
                        <p className="mt-1 text-xs text-gray-500">Auto-generated from English title. Must be unique.</p>
                    </div>

                    {/* Category Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Category
                        </label>
                        <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 cursor-pointer"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Select a Category</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* City Field (Conditional) */}
                    {formData.category === "Area Guide" && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                City
                            </label>
                            <select
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 cursor-pointer"
                                value={formData.city || ""}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            >
                                <option value="">Select a City</option>
                                {CITIES.map((city) => (
                                    <option key={city} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Article Image
                        </label>
                        <div className="mt-2 flex items-center gap-4">
                            {formData.image && (
                                <img
                                    src={formData.image}
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

                {/* Translation Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px overflow-x-auto" aria-label="Tabs">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => setActiveTab(lang.code)}
                                    className={`${activeTab === lang.code
                                        ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                        } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex-1 text-center transition-colors cursor-pointer`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Title ({activeTab.toUpperCase()})
                            </label>
                            <input
                                type="text"
                                required={activeTab === "en"} // Require English title broadly? Or handled by validation logic.
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.translations[activeTab]?.title || ""}
                                onChange={(e) => handleTranslationChange("title", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    H2 Subtitle ({activeTab.toUpperCase()})
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                    value={formData.translations[activeTab]?.h2 || ""}
                                    onChange={(e) => handleTranslationChange("h2", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    H3 Subtitle ({activeTab.toUpperCase()})
                                </label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                    value={formData.translations[activeTab]?.h3 || ""}
                                    onChange={(e) => handleTranslationChange("h3", e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Content ({activeTab.toUpperCase()})
                            </label>
                            <RichTextEditor
                                key={activeTab}
                                value={formData.translations[activeTab]?.content || ""}
                                onChange={(value: string) =>
                                    handleTranslationChange("content", value)
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                    >
                        {saving ? "Saving..." : "Save Article"}
                    </button>
                </div>
            </form>
        </div>
    );
}
