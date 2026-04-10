"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { ColDef } from "ag-grid-community";
import { DataGrid } from "@/components/ui/data-grid";
import { CurrencyRenderer, CategoryBadgeRenderer } from "@/components/ui/grid-renderers";
import { Can } from "@/components/auth/can";

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
  isActive: string;
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
          <Button variant="primary" type="button" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} className="mr-2" />
            Add Product
          </Button>
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
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
    </div>
  );
}
