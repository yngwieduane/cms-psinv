"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";

interface Translation {
    title: string;
    description: string;
}

interface ArticleData {
    image: string;
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
        translations: {
            en: { title: "", description: "" },
            ar: { title: "", description: "" },
            zh: { title: "", description: "" },
            ru: { title: "", description: "" },
            nl: { title: "", description: "" },
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

    const handleTranslationChange = (
        field: keyof Translation,
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            translations: {
                ...prev.translations,
                [activeTab]: {
                    ...prev.translations[activeTab],
                    [field]: value,
                },
            },
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const articleData = {
                ...formData,
                updatedAt: serverTimestamp(),
            };

            if (isNew) {
                await addDoc(collection(db, "articles"), {
                    ...articleData,
                    createdAt: serverTimestamp(),
                    status: "published", // default status
                });
            } else {
                await setDoc(doc(db, "articles", articleId), articleData, { merge: true });
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
                    className="text-gray-600 hover:text-gray-900"
                >
                    Cancel
                </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Shared Fields */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        General Information
                    </h2>
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
                                        } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex-1 text-center transition-colors`}
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
                                required={activeTab === "en"}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                                value={formData.translations[activeTab]?.title || ""}
                                onChange={(e) => handleTranslationChange("title", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Description ({activeTab.toUpperCase()})
                            </label>
                            <textarea
                                rows={5}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono text-gray-900"
                                value={formData.translations[activeTab]?.description || ""}
                                onChange={(e) =>
                                    handleTranslationChange("description", e.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || uploading}
                        className="px-6 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Article"}
                    </button>
                </div>
            </form>
        </div>
    );
}
