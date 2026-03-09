"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/components/dashboard/RichTextEditor";
import { Eye, Save, RefreshCw, Link as LinkIcon, Languages, X } from "lucide-react";

interface Translation {
    title: string;
    h2: string;
    h3: string;
    content: string;
}

interface ArticleData {
    image: string;
    gallery?: string[];
    youtubeUrl?: string;
    slug: string;
    category: string;
    city?: string;
    translations: {
        [key: string]: Translation;
    };
}

const LANGUAGES = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ar", label: "العربية", flag: "🇦🇪" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "nl", label: "Dutch", flag: "🇳🇱" },
];

const CATEGORIES = [
    "UAE Real Estate Trends",
    "Real Estate Tips and Advice",
    "Rules and Regulations",
    "Laws",
    "Technology",
    "Property Guide",
    "Area Guide",
    "News"
];

const CITIES = [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ras Al Khaimah",
    "Al Ain",
    "Umm Al Quwain",
];

export default function ArticleEditorPage() {
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
                setFormData((prev) => ({
                    ...prev,
                    ...data,
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

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-');
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

            if (activeTab === 'en' && field === 'title') {
                const currentSlugified = slugify(prev.translations.en.title);
                const newSlug = slugify(value);

                if (prev.slug === currentSlugified || prev.slug === "") {
                    newState.slug = newSlug;
                }
            }

            return newState;
        });
    };

    const checkSlugUnique = async (slug: string) => {
        const q = query(collection(db, "articles"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return true;

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
                await setDoc(doc(db, "articles", formData.slug), {
                    ...articleData,
                    createdAt: serverTimestamp(),
                    status: "draft",
                });
            } else {
                if (articleId !== formData.slug) {
                    await setDoc(doc(db, "articles", formData.slug), articleData);
                    await deleteDoc(doc(db, "articles", articleId));
                } else {
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

    if (loading) return <div className="p-6 text-gray-400">Loading editor...</div>;

    const currentTitle = formData.translations.en.title || (isNew ? "New Article" : "Edit Article");

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
                        href={formData.slug && formData.category ? `https://www.psinv.net/en/articles/${slugify(formData.category)}${slugify(formData.category) === 'area-guide' && formData.city ? `/${slugify(formData.city)}` : ""}/${formData.slug}` : "#"}
                        target={formData.slug && formData.category ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-[#3c64f4] text-[#3c64f4] transition-colors text-sm font-medium ${!(formData.slug && formData.category)
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-[#3c64f4]/10'
                            }`}
                        onClick={(e) => {
                            if (!(formData.slug && formData.category)) {
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

            {/* Language Tabs */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl flex items-center overflow-x-auto p-1.5">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => setActiveTab(lang.code)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 text-sm font-medium rounded-lg transition-colors ${activeTab === lang.code
                            ? "text-white bg-[#2d2d30] shadow-sm border border-[#3e3e42]"
                            : "text-gray-400 hover:text-gray-300 hover:bg-[#2d2d30]/50 border border-transparent"
                            }`}
                    >
                        <span>{lang.flag} {lang.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${formData.translations[lang.code]?.title ? 'bg-[#10b981]' : 'bg-gray-600'}`}></div>
                    </button>
                ))}
            </div>

            {/* Translation Specific Content */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {LANGUAGES.find(l => l.code === activeTab)?.flag} Content ({activeTab.toUpperCase()})
                    </h2>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            required={activeTab === "en"}
                            className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                            value={formData.translations[activeTab]?.title || ""}
                            onChange={(e) => handleTranslationChange("title", e.target.value)}
                            placeholder="e.g. The Future of Real Estate"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                H2 Subtitle
                            </label>
                            <input
                                type="text"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.translations[activeTab]?.h2 || ""}
                                onChange={(e) => handleTranslationChange("h2", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                H3 Subtitle
                            </label>
                            <input
                                type="text"
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.translations[activeTab]?.h3 || ""}
                                onChange={(e) => handleTranslationChange("h3", e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Rich Text Content
                        </label>
                        <div className="border border-[#3e3e42] rounded-lg overflow-hidden [&_.ql-toolbar]:bg-[#2d2d30] [&_.ql-toolbar]:border-b-[#3e3e42] [&_.ql-container]:bg-[#1c1c1f] [&_.ql-container]:text-gray-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[300px]">
                            <RichTextEditor
                                key={activeTab}
                                value={formData.translations[activeTab]?.content || ""}
                                onChange={(value: string) => handleTranslationChange("content", value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-[#212124] border border-[#2d2d30] rounded-xl p-8 shadow-sm">
                <h2 className="text-xl font-bold text-white mb-8">
                    General Settings
                </h2>

                <div className="space-y-6">
                    {/* Slug & Category */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Slug (URL Identifier)
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-400 font-mono focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                            />
                            <p className="mt-2 text-xs text-gray-500">Auto-generated from English title. Must be unique.</p>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Category
                            </label>
                            <select
                                className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="" className="bg-[#1c1c1f]">Select a Category</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat} className="bg-[#1c1c1f]">
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* City (Conditional) & Youtube URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formData.category === "Area Guide" && (
                            <div>
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    City
                                </label>
                                <select
                                    className="w-full bg-[#1c1c1f] border border-[#3e3e42] rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-[#3c64f4] focus:ring-1 focus:ring-[#3c64f4] transition-colors"
                                    value={formData.city || ""}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                >
                                    <option value="" className="bg-[#1c1c1f]">Select a City</option>
                                    {CITIES.map((city) => (
                                        <option key={city} value={city} className="bg-[#1c1c1f]">
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={formData.category !== "Area Guide" ? "col-span-1 md:col-span-2" : ""}>
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
                    </div>

                    {/* Featured Image */}
                    <div className="pt-4 border-t border-[#3e3e42]">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-4">
                            Main Article Image
                        </label>
                        <div className="flex items-center gap-6">
                            {formData.image ? (
                                <img
                                    src={formData.image}
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

                    {/* Gallery Images */}
                    <div className="pt-4 border-t border-[#3e3e42]">
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
