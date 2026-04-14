"use client";

import { useState, useRef } from "react";
import { Card, CardBody, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import toast from "react-hot-toast";

interface ImportPreview {
  total: number;
  valid: number;
  failed: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}

interface ImportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful (non-dry-run) import so the parent can refresh. */
  onImported: () => void;
}

export function ImportProductsModal({
  isOpen,
  onClose,
  onImported,
}: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreview(null);
    setError(null);
    if (!picked) {
      setText("");
      return;
    }
    try {
      const content = await picked.text();
      setText(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
      setText("");
    }
  };

  const runImport = async (dryRun: boolean) => {
    if (!text) {
      setError("Pick a CSV file first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text, dryRun }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || "Import failed");
      setPreview({
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
        onImported();
        handleClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setText("");
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClose();
  };

  if (!isOpen) return null;

  return (
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
            onClick={handleClose}
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
              <code className="bg-gray-100 px-1 rounded">category</code> are
              required.
            </p>
            <p className="text-xs text-gray-600">
              Header row:{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">
                name, category, subcategory, wholesalePrice, retailPrice, unit,
                stemCount, colour, season, supplier, notes, isActive
              </code>
            </p>
            <p className="text-xs text-gray-600">
              Category accepts Flowers, Foliage, Sundries, Containers, Ribbons,
              Accessories.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              CSV file
            </label>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[#1B4332] file:text-white file:cursor-pointer"
            />
            {file && (
              <p className="text-xs text-gray-600 mt-1">
                {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {preview && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Preview: {preview.valid} of {preview.total} rows look good
                {preview.failed > 0 && (
                  <span className="text-red-700">
                    {" "}
                    ({preview.failed} will be skipped)
                  </span>
                )}
                .
              </p>
              {preview.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto text-xs text-red-800 space-y-1">
                  {preview.errors.slice(0, 20).map((e, idx) => (
                    <div key={`${e.row}-${e.field ?? idx}`}>
                      Row {e.row}
                      {e.field ? ` (${e.field})` : ""}: {e.message}
                    </div>
                  ))}
                  {preview.errors.length > 20 && (
                    <div className="italic text-gray-600">
                      ... and {preview.errors.length - 20} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>

        <CardFooter className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => runImport(true)}
            disabled={loading || !text}
          >
            {loading ? "Checking..." : "Preview"}
          </Button>
          <Button
            variant="primary"
            onClick={() => runImport(false)}
            disabled={
              loading || !text || (preview !== null && preview.valid === 0)
            }
          >
            {loading ? "Importing..." : "Import"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
