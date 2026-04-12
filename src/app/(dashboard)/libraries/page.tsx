"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Upload } from "lucide-react";
import { ColDef } from "ag-grid-community";
import { DataGrid } from "@/components/ui/data-grid";
import { CurrencyRenderer, CategoryBadgeRenderer } from "@/components/ui/grid-renderers";
import { Can } from "@/components/auth/can";
import toast from "react-hot-toast";

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
  isActive: boolean;
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
}

export default function LibrariesPage() {
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
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- CSV import state (#22) ---
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

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categoryMap: Record<string, string> = {
    "Flowers": "flower", "Foliage": "foliage", "Sundries": "sundry",
    "Containers": "container", "Ribbons": "ribbon",
  };
  const categories = ["All", "Flowers", "Foliage", "Sundries", "Containers", "Ribbons"];
  const categoryOptions = ["Flowers", "Foliage", "Sundries", "Containers", "Ribbons"];
  const seasonOptions = ["Spring", "Summer", "Autumn", "Winter", "Year Round"];

  const filteredProducts = selectedCategory && selectedCategory !== "All"
    ? products.filter((p) => p.category === categoryMap[selectedCategory])
    : products;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Product name is required";
    }

    if (!formData.category) {
      errors.category = "Category is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          category: categoryMap[formData.category] || formData.category,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to create product"
        );
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
    });
    setFormErrors({});
    setSubmitError(null);
  };

  // --- CSV import (#22) ---
  // Two-step flow: pick file -> dry-run preview -> commit. The
  // preview protects the user from dropping a malformed price list
  // and silently corrupting their library. Invalid rows are
  // reported and skipped but never block the valid ones.
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
      setImportError(
        err instanceof Error ? err.message : "Failed to read file"
      );
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
      if (!res.ok) {
        throw new Error(data.message || data.error || "Import failed");
      }
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
        // Refresh the grid so the new rows show up immediately.
        const refreshed = await fetch("/api/products");
        if (refreshed.ok) {
          setProducts(await refreshed.json());
        }
        closeImportModal();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportText("");
    setImportPreview(null);
    setImportError(null);
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  };

  const columnDefs: ColDef[] = [
    {
      field: "name",
      headerName: "Name",
      width: 180,
      sortable: true,
      filter: true,
    },
    {
      field: "category",
      headerName: "Category",
      width: 140,
      cellRenderer: CategoryBadgeRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "subcategory",
      headerName: "Subcategory",
      width: 140,
      sortable: true,
      filter: true,
    },
    {
      field: "wholesalePrice",
      headerName: "Wholesale Price",
      width: 140,
      cellRenderer: CurrencyRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "retailPrice",
      headerName: "Retail Price",
      width: 140,
      cellRenderer: CurrencyRenderer,
      sortable: true,
      filter: true,
    },
    {
      field: "colour",
      headerName: "Colour",
      width: 120,
      sortable: true,
      filter: true,
    },
    {
      field: "season",
      headerName: "Season",
      width: 120,
      sortable: true,
      filter: true,
    },
    {
      field: "supplier",
      headerName: "Supplier",
      width: 140,
      sortable: true,
      filter: true,
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-serif font-bold text-gray-900">Libraries</h1>
          <p className="text-gray-600 mt-1">Manage your product library</p>
        </div>
        <Can permission="products:create">
          <div className="flex gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowImportModal(true)}
            >
              <Upload size={20} className="mr-2" />
              Import CSV
            </Button>
            <Button variant="primary" type="button" onClick={() => setShowCreateModal(true)}>
              <Plus size={20} className="mr-2" />
              Add Product
            </Button>
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

      {/* Category Tabs */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category === "All" ? null : category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colours ${
                  (selectedCategory === category || (selectedCategory === null && category === "All"))
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

      {/* Products Table */}
      <Card>
        <CardBody className="p-0">
          <DataGrid
            rowData={filteredProducts}
            columnDefs={columnDefs}
            loading={loading}
            emptyMessage="No products found. Add your first product to get started."
            pageSize={20}
          />
        </CardBody>
      </Card>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create Product</h2>
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
                {/* Name Field */}
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
                    <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Category Field */}
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
                    <p className="text-red-600 text-sm mt-1">{formErrors.category}</p>
                  )}
                </div>

                {/* Subcategory Field */}
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

                {/* Wholesale Price Field */}
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

                {/* Retail Price Field */}
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

                {/* Colour Field */}
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

                {/* Season Field */}
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

                {/* Supplier Field */}
                <div className="col-span-2">
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
              </div>
            </CardBody>

            <CardFooter className="flex justify-end gap-3 border-t pt-4">
              <Button
                variant="secondary"
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

      {/* CSV Import Modal (#22) */}
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
                    Preview: {importPreview.valid} of {importPreview.total}{" "}
                    rows look good
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
                variant="secondary"
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
