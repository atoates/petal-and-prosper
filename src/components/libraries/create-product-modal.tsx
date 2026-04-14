"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Image as ImageIcon } from "lucide-react";
import { ProductThumbnail } from "@/components/ui/product-image";
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
  imageUrl?: string | null;
  isActive: boolean;
}

const categoryOptions = ["Flowers", "Foliage", "Sundries", "Containers", "Ribbons"];
const seasonOptions = ["Spring", "Summer", "Autumn", "Winter", "Year Round"];
const categoryMap: Record<string, string> = {
  Flowers: "flower",
  Foliage: "foliage",
  Sundries: "sundry",
  Containers: "container",
  Ribbons: "ribbon",
};

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
}

export function CreateProductModal({
  isOpen,
  onClose,
  onCreated,
}: CreateProductModalProps) {
  const [formData, setFormData] = useState({
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

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Product name is required";
    if (!formData.category) errors.category = "Category is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
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
        throw new Error(errorData.error || "Failed to create product");
      }

      const newProduct = await response.json();
      toast.success(`${newProduct.name} added to library`);
      onCreated(newProduct);
      handleClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create product"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Product
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
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
                <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
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
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Product"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
