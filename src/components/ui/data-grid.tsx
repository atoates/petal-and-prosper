"use client";

import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { useRef, useEffect, useState } from "react";
import "ag-grid-community/styles/ag-grid.css";
import "@/styles/ag-grid-theme.css";

interface DataGridProps {
  rowData: Record<string, unknown>[];
  columnDefs: ColDef[];
  onRowClicked?: (event: RowClickedEvent) => void;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  animateRows?: boolean;
  suppressPaginationPanel?: boolean;
}

export const DataGrid = ({
  rowData,
  columnDefs,
  onRowClicked,
  loading = false,
  emptyMessage = "No records found",
  pageSize = 20,
  animateRows = true,
  suppressPaginationPanel = false,
}: DataGridProps) => {
  const gridRef = useRef<AgGridReact>(null);
  const apiRef = useRef<GridApi | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.sizeColumnsToFit();
    }
  }, [columnDefs, rowData]);

  const handleGridReady = (event: GridReadyEvent) => {
    apiRef.current = event.api;
    event.api.sizeColumnsToFit();
  };

  const handleFirstDataRendered = () => {
    if (apiRef.current) {
      apiRef.current.sizeColumnsToFit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 w-full h-64 md:h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B4332]"></div>
          <p className="mt-4 text-gray-600">Loading records...</p>
        </div>
      </div>
    );
  }

  if (!rowData || rowData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 w-full h-64 md:h-96">
        <p className="text-gray-500 text-lg text-center px-4">{emptyMessage}</p>
      </div>
    );
  }

  const gridHeight = isMobile ? "400px" : "600px";

  return (
    <div className="ag-theme-custom w-full h-full" style={{ height: gridHeight }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        onRowClicked={onRowClicked}
        onGridReady={handleGridReady}
        onFirstDataRendered={handleFirstDataRendered}
        pagination={true}
        paginationPageSize={isMobile ? 10 : pageSize}
        paginationPageSizeSelector={isMobile ? [10, 20] : [10, 20, 50, 100]}
        suppressPaginationPanel={suppressPaginationPanel}
        animateRows={animateRows}
        domLayout="normal"
        suppressMovableColumns={isMobile}
        suppressDragLeaveHidesColumns={true}
        defaultColDef={{
          flex: 1,
          minWidth: isMobile ? 80 : 100,
          sortable: true,
          filter: !isMobile,
          resizable: !isMobile,
        }}
      />
    </div>
  );
};
