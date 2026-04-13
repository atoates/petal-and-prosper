"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { Wand2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { ExtractedInvoice } from "@/lib/anthropic";

type PageState = "upload" | "loading" | "success" | "error";

export default function ScanInvoicePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [pageState, setPageState] = useState<PageState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [invoiceData, setInvoiceData] = useState<ExtractedInvoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(true);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget === dropZoneRef.current) {
        setIsDragActive(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          setSelectedFile(file);
          setErrorMessage(null);
        } else {
          toast.error("Please drop a PDF file");
        }
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.currentTarget.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type === "application/pdf") {
          setSelectedFile(file);
          setErrorMessage(null);
        } else {
          toast.error("Please select a PDF file");
          setSelectedFile(null);
        }
      }
    },
    []
  );

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setPageState("loading");
    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const response = await fetch("/api/ai/scan-invoice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan invoice");
      }

      const data: ExtractedInvoice = await response.json();
      setInvoiceData(data);
      setPageState("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to scan invoice"
      );
      setPageState("error");
    }
  };

  const handleScanAnother = () => {
    setPageState("upload");
    setSelectedFile(null);
    setInvoiceData(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = () => {
    toast("Import feature coming soon", {
      icon: "✨",
    });
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "N/A";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wand2 size={32} className="text-[#1B4332]" />
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              Invoice Scanner
            </h1>
          </div>
          <p className="text-gray-600">
            Upload a supplier invoice and let AI extract the details
          </p>
        </div>

        {/* Upload State */}
        {pageState === "upload" && (
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragActive
                  ? "border-[#1B4332] bg-sage-50"
                  : "border-gray-300 hover:border-gray-400 bg-white"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                size={48}
                className={`mx-auto mb-4 ${
                  isDragActive ? "text-[#1B4332]" : "text-gray-400"
                }`}
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Drag and drop your PDF here
              </h3>
              <p className="text-gray-600 mb-4">or click to select a file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Selected File Name */}
            {selectedFile && (
              <div className="bg-sage-50 border border-sage-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Selected file:</span>{" "}
                  {selectedFile.name}
                </p>
              </div>
            )}

            {/* Scan Button */}
            <div className="flex gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleScan}
                disabled={!selectedFile}
              >
                Scan Invoice
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Different File
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 size={48} className="text-[#1B4332] animate-spin mb-4" />
            <p className="text-lg text-gray-600">Analysing invoice...</p>
          </div>
        )}

        {/* Success State */}
        {pageState === "success" && invoiceData && (
          <div className="space-y-6">
            {/* Supplier Details */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-serif font-bold text-gray-900">
                  Supplier Details
                </h2>
              </CardHeader>
              <CardBody className="bg-sage-50">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Supplier Name</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {invoiceData.supplierName || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {invoiceData.invoiceNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Invoice Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(invoiceData.invoiceDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Due Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(invoiceData.dueDate)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Line Items Table */}
            {invoiceData.items && invoiceData.items.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-serif font-bold text-gray-900">
                    Line Items
                  </h2>
                </CardHeader>
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">
                            Description
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">
                            Category
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">
                            Quantity
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">
                            Unit Price
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-900">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceData.items.map((item, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-sage-50/50"
                          >
                            <td className="py-3 px-4 text-gray-900">
                              {item.description}
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {item.category || "-"}
                            </td>
                            <td className="text-right py-3 px-4 text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="text-right py-3 px-4 text-gray-900">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="text-right py-3 px-4 font-semibold text-gray-900">
                              {formatCurrency(item.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Totals */}
            <Card>
              <CardBody className="bg-sage-50">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(invoiceData.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-600">VAT</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(invoiceData.vat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                    <span className="text-lg font-semibold text-gray-900">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-[#1B4332]">
                      {formatCurrency(invoiceData.total)}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center pb-8">
              <Button variant="primary" size="lg" onClick={handleImport}>
                Import to Order
              </Button>
              <Button variant="outline" size="lg" onClick={handleScanAnother}>
                Scan Another
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {pageState === "error" && (
          <Card>
            <CardBody className="text-center">
              <div className="mb-4">
                <p className="text-lg font-semibold text-red-600 mb-2">
                  Failed to scan invoice
                </p>
                <p className="text-gray-600">{errorMessage}</p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button variant="primary" onClick={handleScanAnother}>
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select Different File
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
