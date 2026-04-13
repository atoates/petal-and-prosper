"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Upload, Package, Trash2, ChevronDown, ChevronUp, Search, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { ProductImage, ProductThumbnail } from "@/components/ui/product-image";
import { Can } from "@/components/auth/can";
import toast from "react-hot-toast";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  wholesalePrice?: string;
  retailPrice?: string;
  colour?: string;
  season?: string;
  supplier?: string;
  imageUrl?: string | null;
  isActive: boolean;
}

interface BundleItemShape {
  id?: string;
  productId?: string | null;
  description: string;
  category?: string | null;
  quantity: number;
  product?: Product | null;
}

interface Bundle {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  items: BundleItemShape[];
}

interface FormData {
  name: string;
  category: string;
  subcategory: string;
  wholesalePrice: string;
  retailPrice: string;
  colour: string;
  season: string;
  supplier: string;
  imageUrl: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const categoryMap: Record<string, string> = {
  Flowers: "flower",
  Foliage: "foliage",
  Sundries: "sundry",
  Containers: "container",
  Ribbons: "ribbon",
};
const categories = ["All", "Flowers", "Foliage", "Sundries", "Containers", "Ribbons"];
const categoryOptions = ["Flowers", "Foliage", "Sundries", "Containers", "Ribbons"];
const seasonOptions = ["Spring", "Summer", "Autumn", "Winter", "Year Round"];
const BUNDLE_CATEGORY_OPTIONS = [
  { value: "flower", label: "Flower" },
  { value: "foliage", label: "Foliage" },
  { value: "sundry", label: "Sundry" },
  { value: "container", label: "Container" },
  { value: "ribbon", label: "Ribbon" },
  { value: "accessory", label: "Accessory" },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function LibrariesPage() {
  const [activeTab, setActiveTab] = useState<"products" | "bundles">("products");

  /* ---------- Products state ---------- */
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    subcategory: "",
    wholesalePrice: "",
    retailPrice: "",
    colour: "",
    season: "",
    supplier: "",
    imageUrl: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* ---------- CSV import state ---------- */
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState<string>("");
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<null | {
    total: number;
    valid: number;
    failed: number;
    errors: { row: number; field?: string; message: string }[];
  }>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  /* ---------- Bundles state ---------- */
  const [bundlesData, setBundlesData] = useState<Bundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState(true);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [bundleForm, setBundleForm] = useState<{
    name: string;
    description: string;
    items: Array<{
      key: string;
      productId: string;
      description: string;
      category: string;
      quantity: number;
    }>;
  }>({ name: "", description: "", items: [] });
  const [bundleSubmitting, setBundleSubmitting] = useState(false);
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);

  /* ------------------------------------------------------------------ */
  /*  Data fetching                                                      */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    const fetchBundles = async () => {
      try {
        setBundlesLoading(true);
        const response = await fetch("/api/bundles");
        if (response.ok) {
          setBundlesData(await response.json());
        }
      } catch {
        // Bundles are optional
      } finally {
        setBundlesLoading(false);
      }
    };

    fetchProducts();
    fetchBundles();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  Products helpers                                                   */
  /* ------------------------------------------------------------------ */

  const filteredProducts =
    selectedCategory && selectedCategory !== "All"
      ? products.filter((p) => p.category === categoryMap[selectedCategory])
      : products;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Product name is required";
    if (!formData.category) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          category: categoryMap[formData.category] || formData.category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }

      const newProduct = await response.json();
      setProducts((prev) => [...prev, newProduct]);
      setShowCreateModal(false);
      setFormData({
        name: "",
        category: "",
        subcategory: "",
        wholesalePrice: "",
        retailPrice: "",
        colour: "",
        season: "",
        supplier: "",
        imageUrl: "",
      });
      setFormErrors({});
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormData({
      name: "",
      category: "",
      subcategory: "",
      wholesalePrice: "",
      retailPrice: "",
      colour: "",
      season: "",
      supplier: "",
      imageUrl: "",
    });
    setFormErrors({});
    setSubmitError(null);
  };

  /* ------------------------------------------------------------------ */
  /*  CSV import                                                         */
  /* ------------------------------------------------------------------ */

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportPreview(null);
    setImportError(null);
    if (!file) {
      setImportText("");
      return;
    }
    try {
      const text = await file.text();
      setImportText(text);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to read file");
      setImportText("");
    }
  };

  const runImport = async (dryRun: boolean) => {
    if (!importText) {
      setImportError("Pick a CSV file first");
      return;
    }
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importText, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Import failed");
      setImportPreview({
        total: data.total,
        valid: data.valid,
        failed: data.failed,
        errors: data.errors ?? [],
      });
      if (!dryRun) {
        toast.success(
          `Imported ${data.inserted} product${data.inserted === 1 ? "" : "s"}` +
            (data.failed > 0 ? ` (${data.failed} skipped)` : "")
        );
        const refreshed = await fetch("/api/products");
        if (refreshed.ok) setProducts(await refreshed.json());
        closeImportModal();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const [generatingImages, setGeneratingImages] = useState(false);
  const [genProgress, setGenProgress] = useState<{
    done: number;
    total: number;
    errors: number;
  } | null>(null);

  const handleGenerateMissingImages = async () => {
    const missingCount = products.filter((p) => !p.imageUrl).length;
    if (missingCount === 0) {
      toast("All products already have images");
      return;
    }
    if (
      !confirm(
        `Generate AI stock images for ${missingCount} product${missingCount === 1 ? "" : "s"}? This may take a minute or two.`
      )
    ) {
      return;
    }
    setGeneratingImages(true);
    setGenProgress({ done: 0, total: missingCount, errors: 0 });
    const toastId = toast.loading(
      `Generating images (0 / ${missingCount})...`
    );

    let totalUpdated = 0;
    const allErrors: Array<{ name: string; message: string }> = [];

    try {
      // Server processes a small batch per request (to avoid request
      // timeouts on long-running OpenAI calls). Keep calling until it
      // reports done=true or no further progress is made.
      // Safety cap: don't loop forever if something goes wrong.
      for (let i = 0; i < 50; i++) {
        const res = await fetch("/api/products/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ missingOnly: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Image generation failed");
        }
        const updated: Product[] = data.updated ?? [];
        const errors: Array<{ name: string; message: string }> = data.errors ?? [];

        if (updated.length > 0) {
          setProducts((prev) =>
            prev.map((p) => {
              const u = updated.find((x) => x.id === p.id);
              return u ? { ...p, imageUrl: u.imageUrl } : p;
            })
          );
        }
        totalUpdated += updated.length;
        allErrors.push(...errors);

        setGenProgress({
          done: totalUpdated,
          total: missingCount,
          errors: allErrors.length,
        });
        toast.loading(
          `Generating images (${totalUpdated} / ${missingCount})...`,
          { id: toastId }
        );

        // Stop if server says done, or if no progress this round
        // (otherwise we'd loop forever on persistent per-product errors).
        if (data.done || (updated.length === 0 && errors.length === 0)) break;
        if (updated.length === 0 && errors.length > 0) break;
      }

      if (allErrors.length === 0) {
        toast.success(
          `Generated ${totalUpdated} image${totalUpdated === 1 ? "" : "s"}`,
          { id: toastId }
        );
      } else {
        toast.error(
          `Generated ${totalUpdated}, ${allErrors.length} failed. First error: ${allErrors[0]?.message ?? "unknown"}`,
          { id: toastId, duration: 10000 }
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate images",
        { id: toastId, duration: 10000 }
      );
    } finally {
      setGeneratingImages(false);
      // Keep the final progress banner visible for a moment so the user
      // sees the outcome, then clear it.
      setTimeout(() => setGenProgress(null), 5000);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportText("");
    setImportPreview(null);
    setImportError(null);
    if (importInputRef.current) importInputRef.current.value = "";
  };

  /* ------------------------------------------------------------------ */
  /*  Bundles helpers                                                    */
  /* ------------------------------------------------------------------ */

  // Product lookup for the bundle item builder
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of products) {
      const cat = p.category || "other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    }
    return map;
  }, [products]);

  const openBundleModal = (bundle?: Bundle) => {
    if (bundle) {
      setEditingBundle(bundle);
      setBundleForm({
        name: bundle.name,
        description: bundle.description || "",
        items: bundle.items.map((bi) => ({
          key: bi.id || `item-${Math.random().toString(36).slice(2)}`,
          productId: bi.productId || "",
          description: bi.description,
          category: bi.category || "",
          quantity: bi.quantity,
        })),
      });
    } else {
      setEditingBundle(null);
      setBundleForm({ name: "", description: "", items: [] });
    }
    setShowBundleModal(true);
  };

  const closeBundleModal = () => {
    setShowBundleModal(false);
    setEditingBundle(null);
    setBundleForm({ name: "", description: "", items: [] });
  };

  const addBundleItem = () => {
    setBundleForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          key: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          productId: "",
          description: "",
          category: "",
          quantity: 1,
        },
      ],
    }));
  };

  const removeBundleItem = (index: number) => {
    setBundleForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateBundleItem = (index: number, field: string, value: string | number) => {
    setBundleForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index], [field]: value };

      // When a product is selected, auto-fill description and category
      if (field === "productId" && typeof value === "string" && value) {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.description = prod.name + (prod.colour ? ` - ${prod.colour}` : "");
          item.category = prod.category || "";
        }
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSaveBundle = async () => {
    if (!bundleForm.name.trim()) {
      toast.error("Bundle name is required");
      return;
    }
    if (bundleForm.items.length === 0) {
      toast.error("Add at least one item to the bundle");
      return;
    }

    setBundleSubmitting(true);
    try {
      const payload = {
        name: bundleForm.name.trim(),
        description: bundleForm.description.trim() || null,
        items: bundleForm.items.map((bi) => ({
          productId: bi.productId || null,
          description: bi.description || "Untitled item",
          category: bi.category || null,
          quantity: bi.quantity || 1,
        })),
      };

      const url = editingBundle
        ? `/api/bundles/${editingBundle.id}`
        : "/api/bundles";
      const method = editingBundle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save bundle");
      }

      const saved: Bundle = await response.json();

      if (editingBundle) {
        setBundlesData((prev) =>
          prev.map((b) => (b.id === saved.id ? saved : b))
        );
        toast.success("Bundle updated");
      } else {
        setBundlesData((prev) => [saved, ...prev]);
        toast.success("Bundle created");
      }

      closeBundleModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save bundle");
    } finally {
      setBundleSubmitting(false);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;
    try {
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete bundle");
      setBundlesData((prev) => prev.filter((b) => b.id !== bundleId));
      toast.success("Bundle deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bundle");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Products search & sort                                             */
  /* ------------------------------------------------------------------ */

  const [productSearch, setProductSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const displayedProducts = useMemo(() => {
    let list = filteredProducts;

    // Quick search
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          (p.subcategory || "").toLowerCase().includes(q) ||
          (p.colour || "").toLowerCase().includes(q) ||
          (p.season || "").toLowerCase().includes(q) ||
          (p.supplier || "").toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortField];
      const bv = (b as unknown as Record<string, unknown>)[sortField];
      const aStr = (av ?? "").toString().toLowerCase();
      const bStr = (bv ?? "").toString().toLowerCase();
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredProducts, productSearch, sortField, sortDirection]);

  const formatPrice = (val?: string) => {
    if (!val) return "-";
    const n = parseFloat(val);
    return isNaN(n) ? "-" : `\u00a3${n.toFixed(2)}`;
  };

  const categoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      flower: "Flower",
      foliage: "Foliage",
      sundry: "Sundry",
      container: "Container",
      ribbon: "Ribbon",
      accessory: "Accessory",
    };
    return labels[cat] || cat;
  };

  // Colour-coded pill classes per category. Kept deliberately muted so
  // the badges read as data, not decoration.
  const categoryPillClasses = (cat: string) => {
    const map: Record<string, string> = {
      flower: "bg-rose-100 text-rose-800 border-rose-200",
      foliage: "bg-green-100 text-green-800 border-green-200",
      sundry: "bg-amber-100 text-amber-800 border-amber-200",
      container: "bg-slate-100 text-slate-800 border-slate-200",
      ribbon: "bg-purple-100 text-purple-800 border-purple-200",
      accessory: "bg-sky-100 text-sky-800 border-sky-200",
    };
    return map[cat] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="inline ml-0.5" />
    ) : (
      <ChevronDown size={14} className="inline ml-0.5" />
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">
            Libraries
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your product library and bundles
          </p>
        </div>
        <Can permission="products:create">
          <div className="flex gap-3">
            {activeTab === "products" && (
              <>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGenerateMissingImages}
                  disabled={generatingImages}
                  title="Generate AI stock images for products that don't have one yet"
                >
                  {generatingImages ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {generatingImages ? "Generating..." : "Generate images"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowImportModal(true)}
                >
                  <Upload size={16} />
                  Import CSV
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Add Product
                </Button>
              </>
            )}
            {activeTab === "bundles" && (
              <Button
                variant="primary"
                type="button"
                onClick={() => openBundleModal()}
              >
                <Plus size={16} />
                Create Bundle
              </Button>
            )}
          </div>
        </Can>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border-red-200">
          <CardBody>
            <p className="text-red-800">Error: {error}</p>
          </CardBody>
        </Card>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "products"
              ? "border-dark-green text-dark-green"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          Products
          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            {products.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("bundles")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
            activeTab === "bundles"
              ? "border-dark-green text-dark-green"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Package size={14} />
          Bundles
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
            {bundlesData.length}
          </span>
        </button>
      </div>

      {/* ============================================================ */}
      {/*  PRODUCTS TAB                                                 */}
      {/* ============================================================ */}
      {activeTab === "products" && (
        <>
          {/* Category Tabs */}
          <Card className="mb-6">
            <CardBody>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(category === "All" ? null : category)
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedCategory === category ||
                      (selectedCategory === null && category === "All")
                        ? "bg-[#1B4332] text-white"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Image generation progress banner — stays visible for the
              full duration of the (potentially multi-minute) batch job
              so the user always has clear feedback. */}
          {genProgress && (
            <Card className="mb-4 border-dark-green/30 bg-dark-green/5">
              <CardBody className="py-3">
                <div className="flex items-center gap-3">
                  {generatingImages ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-dark-green shrink-0"
                    />
                  ) : (
                    <Sparkles size={18} className="text-dark-green shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {generatingImages
                          ? "Generating AI images..."
                          : "Image generation complete"}
                      </span>
                      <span className="text-xs text-gray-600 tabular-nums shrink-0">
                        {genProgress.done} / {genProgress.total}
                        {genProgress.errors > 0 && (
                          <span className="text-red-600 ml-2">
                            ({genProgress.errors} failed)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-dark-green transition-all duration-300"
                        style={{
                          width: `${genProgress.total === 0 ? 0 : Math.round((genProgress.done / genProgress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Quick search */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full sm:w-80 pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent"
            />
          </div>

          {/* Products Table */}
          <Card>
            <CardBody className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-sage-200 border-t-dark-green" />
                </div>
              ) : displayedProducts.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p>No products found. Add your first product to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10"></th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("name")}
                        >
                          Name <SortIcon field="name" />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("category")}
                        >
                          Category <SortIcon field="category" />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("subcategory")}
                        >
                          Subcategory <SortIcon field="subcategory" />
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("wholesalePrice")}
                        >
                          Wholesale <SortIcon field="wholesalePrice" />
                        </th>
                        <th
                          className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("retailPrice")}
                        >
                          Retail <SortIcon field="retailPrice" />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("colour")}
                        >
                          Colour <SortIcon field="colour" />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("season")}
                        >
                          Season <SortIcon field="season" />
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                          onClick={() => handleSort("supplier")}
                        >
                          Supplier <SortIcon field="supplier" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <ProductImage
                              imageUrl={product.imageUrl}
                              name={product.name}
                              category={categoryLabel(product.category)}
                              colour={product.colour}
                              season={product.season}
                              supplier={product.supplier}
                              showThumbnail
                              thumbnailSize={36}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {product.name}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryPillClasses(product.category)}`}
                            >
                              {categoryLabel(product.category)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {product.subcategory || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                            {formatPrice(product.wholesalePrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                            {formatPrice(product.retailPrice)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {product.colour || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {product.season || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {product.supplier || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      {/* ============================================================ */}
      {/*  BUNDLES TAB                                                  */}
      {/* ============================================================ */}
      {activeTab === "bundles" && (
        <div className="space-y-4">
          {bundlesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-sage-200 border-t-dark-green"></div>
            </div>
          ) : bundlesData.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-4">
                  No bundles yet. Bundles are pre-built arrangements that
                  explode into individual line items when added to an order.
                </p>
                <Can permission="products:create">
                  <Button
                    variant="primary"
                    onClick={() => openBundleModal()}
                  >
                    <Plus size={16} />
                    Create your first bundle
                  </Button>
                </Can>
              </CardBody>
            </Card>
          ) : (
            bundlesData.map((bundle) => {
              const isExpanded = expandedBundle === bundle.id;
              return (
                <Card key={bundle.id}>
                  <CardBody className="p-0">
                    {/* Bundle header row */}
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedBundle(isExpanded ? null : bundle.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sage-100 flex items-center justify-center">
                          <Package size={16} className="text-sage-700" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {bundle.name}
                          </h3>
                          {bundle.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {bundle.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {bundle.items.length} item
                          {bundle.items.length !== 1 ? "s" : ""}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded items */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 py-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[11px] uppercase tracking-wider text-gray-400">
                              <th className="text-left pb-2 font-semibold">
                                Item
                              </th>
                              <th className="text-left pb-2 font-semibold">
                                Category
                              </th>
                              <th className="text-right pb-2 font-semibold">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {bundle.items.map((bi) => (
                              <tr key={bi.id}>
                                <td className="py-2 text-gray-800">
                                  {bi.description}
                                </td>
                                <td className="py-2 text-gray-500 capitalize">
                                  {bi.category || "-"}
                                </td>
                                <td className="py-2 text-gray-800 text-right tabular-nums">
                                  {bi.quantity}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <Can permission="products:update">
                          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBundleModal(bundle);
                              }}
                            >
                              Edit bundle
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBundle(bundle.id);
                              }}
                            >
                              <Trash2 size={14} />
                              Delete
                            </Button>
                          </div>
                        </Can>
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/*  CREATE / EDIT BUNDLE MODAL                                   */}
      {/* ============================================================ */}
      {showBundleModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBundleModal();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-serif font-bold text-gray-900">
                {editingBundle ? "Edit Bundle" : "Create Bundle"}
              </h2>
              <button
                onClick={closeBundleModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Name & description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bundle name *
                  </label>
                  <input
                    type="text"
                    value={bundleForm.name}
                    onChange={(e) =>
                      setBundleForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g. Bridal Bouquet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={bundleForm.description}
                    onChange={(e) =>
                      setBundleForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="A short description of this arrangement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4332] focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Items builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Items ({bundleForm.items.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addBundleItem}
                  >
                    <Plus size={14} />
                    Add item
                  </Button>
                </div>

                {bundleForm.items.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                    <Package
                      size={28}
                      className="mx-auto text-gray-300 mb-2"
                    />
                    <p className="text-sm text-gray-400">
                      Add products to this bundle
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {bundleForm.items.map((item, index) => (
                    <div
                      key={item.key}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="grid grid-cols-12 gap-2 items-start">
                        {/* Product selector */}
                        <div className="col-span-5">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Product
                          </label>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateBundleItem(
                                index,
                                "productId",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                          >
                            <option value="">
                              Select product (or type below)
                            </option>
                            {Object.entries(productsByCategory).map(
                              ([cat, prods]) => (
                                <optgroup
                                  key={cat}
                                  label={
                                    BUNDLE_CATEGORY_OPTIONS.find(
                                      (c) => c.value === cat
                                    )?.label || cat
                                  }
                                >
                                  {prods.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                      {p.colour ? ` - ${p.colour}` : ""}
                                    </option>
                                  ))}
                                </optgroup>
                              )
                            )}
                          </select>
                        </div>

                        {/* Description */}
                        <div className="col-span-3">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              updateBundleItem(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Item name"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                          />
                        </div>

                        {/* Category */}
                        <div className="col-span-2">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) =>
                              updateBundleItem(
                                index,
                                "category",
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                          >
                            <option value="">-</option>
                            {BUNDLE_CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wider">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateBundleItem(
                                index,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            min="1"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#1B4332]"
                          />
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex items-end justify-center pb-0.5">
                          <button
                            type="button"
                            onClick={() => removeBundleItem(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors mt-5"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={closeBundleModal}
                disabled={bundleSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveBundle}
                disabled={bundleSubmitting}
              >
                {bundleSubmitting
                  ? "Saving..."
                  : editingBundle
                  ? "Update Bundle"
                  : "Create Bundle"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  CREATE PRODUCT MODAL                                         */}
      {/* ============================================================ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Create Product
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <CardBody className="py-6 space-y-6">
              {submitError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{submitError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Product Name
                    <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    name="name"
                    placeholder="e.g. Red Rose"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-sm mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Category
                    <span className="text-red-600">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                    className={`w-full px-3 py-2 border rounded-md text-gray-900 bg-white ${
                      formErrors.category ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && (
                    <p className="text-red-600 text-sm mt-1">
                      {formErrors.category}
                    </p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Subcategory
                  </label>
                  <Input
                    type="text"
                    name="subcategory"
                    placeholder="e.g. Long stem"
                    value={formData.subcategory}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Wholesale Price
                  </label>
                  <Input
                    type="number"
                    name="wholesalePrice"
                    placeholder="e.g. 2.50"
                    step="0.01"
                    value={formData.wholesalePrice}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Retail Price
                  </label>
                  <Input
                    type="number"
                    name="retailPrice"
                    placeholder="e.g. 5.99"
                    step="0.01"
                    value={formData.retailPrice}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Colour
                  </label>
                  <Input
                    type="text"
                    name="colour"
                    placeholder="e.g. Red"
                    value={formData.colour}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Season
                  </label>
                  <select
                    name="season"
                    value={formData.season}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                  >
                    <option value="">Select a season</option>
                    {seasonOptions.map((season) => (
                      <option key={season} value={season}>
                        {season}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Supplier
                  </label>
                  <Input
                    type="text"
                    name="supplier"
                    placeholder="e.g. ABC Flowers Ltd"
                    value={formData.supplier}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      Image URL
                    </span>
                  </label>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        type="url"
                        name="imageUrl"
                        placeholder="https://images.unsplash.com/..."
                        value={formData.imageUrl}
                        onChange={handleFormChange}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Paste a direct link to a product photo
                      </p>
                    </div>
                    {formData.imageUrl && (
                      <div className="shrink-0">
                        <ProductThumbnail
                          src={formData.imageUrl}
                          alt="Preview"
                          size={44}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardBody>

            <CardFooter className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateProduct}
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create Product"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/*  CSV IMPORT MODAL                                             */}
      {/* ============================================================ */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="flex justify-between items-center border-b pb-4">
              <h2
                id="import-modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                Import Products from CSV
              </h2>
              <button
                onClick={closeImportModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close import modal"
              >
                <X size={20} />
              </button>
            </CardHeader>

            <CardBody className="py-6 space-y-4">
              <div className="text-sm text-gray-700 space-y-2">
                <p>
                  Upload a CSV with the columns below. Only{" "}
                  <code className="bg-gray-100 px-1 rounded">name</code> and{" "}
                  <code className="bg-gray-100 px-1 rounded">category</code>{" "}
                  are required.
                </p>
                <p className="text-xs text-gray-600">
                  Header row:{" "}
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    name, category, subcategory, wholesalePrice, retailPrice,
                    unit, stemCount, colour, season, supplier, notes, isActive
                  </code>
                </p>
                <p className="text-xs text-gray-600">
                  Category accepts Flowers, Foliage, Sundries, Containers,
                  Ribbons, Accessories.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  CSV file
                </label>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportFileChange}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#1B4332] file:text-white file:cursor-pointer"
                />
                {importFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{importError}</p>
                </div>
              )}

              {importPreview && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    Preview: {importPreview.valid} of {importPreview.total} rows
                    look good
                    {importPreview.failed > 0 && (
                      <span className="text-red-700">
                        {" "}
                        ({importPreview.failed} will be skipped)
                      </span>
                    )}
                    .
                  </p>
                  {importPreview.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto text-xs text-red-800 space-y-1">
                      {importPreview.errors.slice(0, 20).map((e, idx) => (
                        <div key={idx}>
                          Row {e.row}
                          {e.field ? ` (${e.field})` : ""}: {e.message}
                        </div>
                      ))}
                      {importPreview.errors.length > 20 && (
                        <div className="italic text-gray-600">
                          ... and {importPreview.errors.length - 20} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardBody>

            <CardFooter className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="outline"
                onClick={closeImportModal}
                disabled={importLoading}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => runImport(true)}
                disabled={importLoading || !importText}
              >
                {importLoading ? "Checking..." : "Preview"}
              </Button>
              <Button
                variant="primary"
                onClick={() => runImport(false)}
                disabled={
                  importLoading ||
                  !importText ||
                  (importPreview !== null && importPreview.valid === 0)
                }
              >
                {importLoading ? "Importing..." : "Import"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
