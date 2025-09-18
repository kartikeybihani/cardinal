// API helper functions for Cardinal
import type { CardinalMarkdownResponse, CardinalExtractResponse, CardinalCompareResponse, NormalizedData, TableRow, StatementData } from './cardinal';

const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://cardinal-three.vercel.app' 
  : 'http://localhost:3000';

// Re-export types from cardinal.ts for convenience
export type { CardinalMarkdownResponse, CardinalExtractResponse, CardinalCompareResponse, NormalizedData, TableRow, StatementData };

// Legacy interfaces for backward compatibility
export interface ExtractResponse {
  account_number: string;
  statement_period_start: string;
  statement_period_end: string;
  ending_value: number;
  total_fees: number;
}

export interface CompareResponse {
  dashboard_url: string;
  comparison_id: string;
  status: string;
}

// Upload files or URL - now returns Cardinal markdown response
export async function uploadFiles(files: File[]): Promise<CardinalMarkdownResponse[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("file", file);
  });

  const response = await fetch(`${API_BASE}/api/card/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload files');
  }

  return response.json();
}

// Upload from URL - now returns Cardinal markdown response
export async function uploadFromUrl(fileUrl: string): Promise<CardinalMarkdownResponse> {
  const response = await fetch(`${API_BASE}/api/card/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrl }),
  });

  if (!response.ok) {
    throw new Error('Failed to process URL');
  }

  return response.json();
}

// Extract header data
export async function extractHeader(fileUrl?: string, file?: File): Promise<ExtractResponse> {
  const response = await fetch(`${API_BASE}/api/card/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrl, file }),
  });

  if (!response.ok) {
    throw new Error('Failed to extract header');
  }

  return response.json();
}

// Run comparison
export async function runCompare(fileUrl?: string, file?: File, dense?: boolean): Promise<CompareResponse> {
  const response = await fetch(`${API_BASE}/api/card/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileUrl, file, dense }),
  });

  if (!response.ok) {
    throw new Error('Failed to run comparison');
  }

  return response.json();
}
