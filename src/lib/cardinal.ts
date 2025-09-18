// Cardinal API configuration
export const CARDINAL_URL = "https://api.trycardinal.ai";
export const headers = { "x-api-key": process.env.CARDINAL_API_KEY! };

// Cardinal API endpoints
export const ENDPOINTS = {
  MARKDOWN: `${CARDINAL_URL}/markdown`,
  EXTRACT: `${CARDINAL_URL}/extract`,
  COMPARE: `${CARDINAL_URL}/compare`,
} as const;

// Types for Cardinal responses
export interface CardinalMarkdownResponse {
  pages: Array<{
    pageIndex: number;
    processed_tables: string[]; // HTML strings
    text: string;
  }>;
  status: string;
  message?: string;
}

export interface CardinalExtractResponse {
  response: string; // JSON string that needs parsing
  status: string;
  message?: string;
}

export interface CardinalCompareResponse {
  dashboard_url: string;
  comparison_id: string;
  status: string;
  message?: string;
}

// Table classification types
export interface TableRow {
  data: Record<string, string>;
  provenance: {
    pageIndex: number;
    tableIndex: number;
    rowIndex: number;
    html: string;
  };
}

export interface NormalizedData {
  positions: TableRow[];
  transactions: TableRow[];
  fees: TableRow[];
}
