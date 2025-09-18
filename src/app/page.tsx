"use client";
/* eslint-disable no-console */

import { useState } from "react";
import { uploadFiles, uploadFromUrl, type StatementData } from "@/lib/api";
import { convertCardinalToStatement } from "@/lib/normalizer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"upload" | "results">("upload");
  const [resultsTab, setResultsTab] = useState<
    "summary" | "tables" | "provenance"
  >("summary");
  const [fileUrl, setFileUrl] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>("");
  const [statementData, setStatementData] = useState<StatementData[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<number>(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = (files: File[]) => {
    setError("");
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      // Validate file type
      if (file.type !== "application/pdf") {
        errors.push(`${file.name}: Not a PDF file`);
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`${file.name}: File size must be less than 50MB`);
        return;
      }

      // Check for duplicates
      const isDuplicate = uploadedFiles.some(
        (existingFile) =>
          existingFile.name === file.name && existingFile.size === file.size
      );

      if (isDuplicate) {
        errors.push(`${file.name}: File already uploaded`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setError(errors.join(", "));
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    // Also remove corresponding statement data if it exists
    if (statementData[index]) {
      setStatementData((prev) => prev.filter((_, i) => i !== index));
    }
    // Adjust selected statement if needed
    if (selectedStatement >= index && selectedStatement > 0) {
      setSelectedStatement((prev) => prev - 1);
    }
  };

  const handleUrlSubmit = async () => {
    if (fileUrl.trim()) {
      setIsProcessing(true);
      setError("");

      try {
        const data = await uploadFromUrl(fileUrl.trim());
        // Convert Cardinal response to frontend format
        const convertedData = convertCardinalToStatement(data);
        setStatementData([convertedData]);
        setActiveTab("results");
      } catch {
        setError("Failed to process the URL. Please try again.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleProcessFiles = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setError("");

    try {
      const data = await uploadFiles(uploadedFiles);

      // Log the received data from API
      console.log("=== FRONTEND RECEIVED DATA ===");
      console.log("Data type:", typeof data);
      console.log("Data is array:", Array.isArray(data));
      console.log("Data length:", data?.length || 0);
      console.log("Full data:", data);
      console.log("=== END FRONTEND DATA ===");

      // Convert Cardinal responses to frontend format
      const convertedData = data.map(convertCardinalToStatement);

      console.log("=== CONVERTED DATA ===");
      console.log("Converted data:", convertedData);
      console.log("=== END CONVERTED DATA ===");

      setStatementData(convertedData);
      setActiveTab("results");
    } catch (error) {
      console.error("Frontend processing error:", error);
      setError("Failed to process the files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            Universal Brokerage Statement Normalizer
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload any brokerage PDF or paste a URL to extract, normalize, and
            analyze your financial statements with AI-powered precision.
          </p>
        </div>

        {activeTab === "upload" && (
          <div className="max-w-4xl mx-auto">
            {/* Upload Section */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold text-black mb-6">
                Upload Your Statement
              </h2>

              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-black">
                      Drop your PDFs here, or{" "}
                      <label className="text-blue-600 cursor-pointer hover:underline">
                        browse files
                        <input
                          type="file"
                          accept=".pdf"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports multiple PDF files up to 50MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center my-8">
                <div className="flex-1 border-t border-gray-200"></div>
                <span className="px-4 text-gray-500 text-sm">or</span>
                <div className="flex-1 border-t border-gray-200"></div>
              </div>

              {/* URL Input */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Paste a file URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://example.com/statement.pdf"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    disabled={!fileUrl.trim() || isProcessing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? "Processing..." : "Process"}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Files Selected Message */}
            {uploadedFiles.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-green-800 font-medium">
                    {uploadedFiles.length} file
                    {uploadedFiles.length > 1 ? "s" : ""} selected
                  </h3>
                  <button
                    onClick={handleProcessFiles}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing
                      ? "Processing..."
                      : `Process ${uploadedFiles.length} File${
                          uploadedFiles.length > 1 ? "s" : ""
                        }`}
                  </button>
                </div>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium text-sm">
                            {file.name}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Features Preview */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">
                  Smart Extraction
                </h3>
                <p className="text-gray-600 text-sm">
                  AI-powered parsing preserves complex table layouts and
                  extracts positions, transactions, and fees accurately.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">
                  Unified Schema
                </h3>
                <p className="text-gray-600 text-sm">
                  Normalize data from any broker into a consistent format for
                  easy analysis and comparison.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">
                  Full Provenance
                </h3>
                <p className="text-gray-600 text-sm">
                  Trace every data point back to its source table for complete
                  transparency and auditability.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "results" &&
          statementData &&
          statementData.length > 0 && (
            <div className="max-w-7xl mx-auto">
              {/* Results Header */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-black">
                      Statement Analysis Results
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {statementData.length} statement
                      {statementData.length > 1 ? "s" : ""} processed on{" "}
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                      Download CSV
                    </button>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Run Compare
                    </button>
                  </div>
                </div>
              </div>

              {/* Statement Selector */}
              {statementData.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-black mb-4">
                    Select Statement to View
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statementData.map((statement, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedStatement(index)}
                        className={`p-4 rounded-lg border-2 transition-colors text-left ${
                          selectedStatement === index
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-medium text-black">
                          Statement {index + 1}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Account: {statement.header.accountNumber}
                        </div>
                        <div className="text-sm text-gray-600">
                          Value: $
                          {statement.header.endingValue.toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Tabs */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xl">
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    {[
                      { key: "summary", label: "Summary" },
                      { key: "tables", label: "Tables & CSV" },
                      { key: "provenance", label: "Provenance" },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() =>
                          setResultsTab(
                            tab.key as "summary" | "tables" | "provenance"
                          )
                        }
                        className={`py-4 px-1 border-b-2 transition-colors ${
                          resultsTab === tab.key
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {resultsTab === "summary" && (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">
                            Account Number
                          </div>
                          <div className="text-lg font-semibold text-black">
                            {
                              statementData[selectedStatement].header
                                .accountNumber
                            }
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">
                            Statement Period
                          </div>
                          <div className="text-lg font-semibold text-black">
                            {new Date(
                              statementData[
                                selectedStatement
                              ].header.periodStart
                            ).toLocaleDateString()}{" "}
                            -{" "}
                            {new Date(
                              statementData[selectedStatement].header.periodEnd
                            ).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">
                            Ending Value
                          </div>
                          <div className="text-lg font-semibold text-black">
                            $
                            {statementData[
                              selectedStatement
                            ].header.endingValue.toLocaleString()}
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-sm text-gray-600">
                            Total Fees
                          </div>
                          <div className="text-lg font-semibold text-black">
                            $
                            {statementData[
                              selectedStatement
                            ].header.totalFees.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Charts Placeholder */}
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-black mb-4">
                            Fees by Category
                          </h3>
                          <div className="h-48 flex items-center justify-center text-gray-500">
                            Chart placeholder
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <h3 className="text-lg font-semibold text-black mb-4">
                            Asset Class Mix
                          </h3>
                          <div className="h-48 flex items-center justify-center text-gray-500">
                            Chart placeholder
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultsTab === "tables" && (
                    <div className="space-y-6">
                      {/* Data Type Tabs */}
                      <div className="flex space-x-4 border-b border-gray-200">
                        {["Positions", "Transactions", "Fees"].map((type) => (
                          <button
                            key={type}
                            className="pb-2 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300"
                          >
                            {type}
                          </button>
                        ))}
                      </div>

                      {/* Sample Data Table */}
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Symbol
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Quantity
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Price
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Value
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Asset Class
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {statementData[selectedStatement].positions.map(
                                (
                                  row: Record<string, unknown>,
                                  index: number
                                ) => (
                                  <tr
                                    key={index}
                                    className={`hover:bg-gray-100 cursor-pointer transition-colors ${
                                      selectedRow === index ? "bg-blue-50" : ""
                                    }`}
                                    onClick={() =>
                                      setSelectedRow(
                                        selectedRow === index ? null : index
                                      )
                                    }
                                  >
                                    <td className="px-4 py-3 text-sm text-black font-medium">
                                      {String(row.symbol)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {String(row.description)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-black">
                                      {String(row.quantity)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-black">
                                      {String(row.price)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-black font-medium">
                                      {String(row.value)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {String(row.assetClass)}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* CSV Preview */}
                      <div className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-300">
                            CSV Preview
                          </h4>
                          <button className="text-xs text-blue-400 hover:text-blue-300">
                            Download Full CSV
                          </button>
                        </div>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {`symbol,description,quantity,price,value,asset_class
${statementData[selectedStatement].positions
  .map(
    (row: Record<string, unknown>) =>
      `${String(row.symbol)},${String(row.description)},${String(
        row.quantity
      )},${String(row.price).replace("$", "")},${String(row.value)
        .replace("$", "")
        .replace(",", "")},${String(row.assetClass)}`
  )
  .join("\n")}`}
                        </pre>
                      </div>
                    </div>
                  )}

                  {resultsTab === "provenance" && (
                    <div className="space-y-6">
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg
                            className="w-8 h-8 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-black mb-2">
                          Select a row to view provenance
                        </h3>
                        <p className="text-gray-600">
                          Click on any row in the Tables & CSV tab to see the
                          original table snippet and source information.
                        </p>
                      </div>

                      {selectedRow !== null && (
                        <div className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-black">
                              Source Table
                            </h4>
                            <div className="text-sm text-gray-600">
                              Page{" "}
                              {
                                statementData[selectedStatement].provenance
                                  .pageIndex
                              }
                              , Table{" "}
                              {
                                statementData[selectedStatement].provenance
                                  .tableIndex
                              }
                              , Row {selectedRow + 1}
                            </div>
                          </div>

                          {/* Original HTML Table */}
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Symbol
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Description
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Quantity
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Price
                                    </th>
                                    <th className="px-3 py-2 text-left font-medium text-gray-700">
                                      Market Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {statementData[
                                    selectedStatement
                                  ].positions.map(
                                    (
                                      row: Record<string, unknown>,
                                      index: number
                                    ) => (
                                      <tr
                                        key={index}
                                        className={
                                          index === selectedRow
                                            ? "bg-blue-50"
                                            : ""
                                        }
                                      >
                                        <td className="px-3 py-2 text-black font-medium">
                                          {String(row.symbol)}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                          {String(row.description)}
                                        </td>
                                        <td className="px-3 py-2 text-black">
                                          {String(row.quantity)}
                                        </td>
                                        <td className="px-3 py-2 text-black">
                                          {String(row.price)}
                                        </td>
                                        <td className="px-3 py-2 text-black font-medium">
                                          {String(row.value)}
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">
                              <strong>Source:</strong> Page{" "}
                              {
                                statementData[selectedStatement].provenance
                                  .pageIndex
                              }{" "}
                              of original PDF, Table{" "}
                              {
                                statementData[selectedStatement].provenance
                                  .tableIndex
                              }{" "}
                              (Positions Summary)
                              <br />
                              <strong>Extraction Method:</strong> Cardinal
                              Markdown with densePdfDetect
                              <br />
                              <strong>Confidence:</strong> 98.5% (High)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
