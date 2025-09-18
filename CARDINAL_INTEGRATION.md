# Cardinal Backend Integration

## Overview
This app uploads any brokerage PDF, parses its **tables + text with layout intact**, normalizes Positions/Transactions/Fees into one schema, and exports CSV. We also **extract header fields** (account number, statement period, ending value, total fees). Every row includes **provenance** (page/table/row) and you can launch Cardinal's eval dashboard for side-by-side comparisons.

## Backend Implementation

### 1. Environment Setup
- Add `CARDINAL_API_KEY` to Vercel environment variables
- All Cardinal calls run from Next.js API routes (server-only)
- Uses `x-api-key` header for authentication

### 2. API Routes

#### `/api/card/upload` → Cardinal Markdown
- Gets **pages** + **processed_tables (HTML)** with dense PDF handling
- Supports both file upload and `fileUrl`
- Preserves complex tables, merged cells and layout
- Tables remain HTML for maximum fidelity

#### `/api/card/extract` → Cardinal Extract  
- Pulls header fields fast with a tiny schema
- Extracts: account_number, statement_period_start/end, ending_value, total_fees
- Uses `fast=true` for speed on header extraction
- Returns parsed JSON response

#### `/api/card/compare` → Cardinal Compare
- One-click "flex" for founders
- Same payload as Markdown plus `dashboard_url` to Cardinal's evals UI
- Optional `densePdfDetect` toggle
- Opens comparison dashboard in new tab

### 3. Normalization Logic
- Iterates `pages[].processed_tables` (HTML strings)
- Uses lightweight HTML parser to classify tables
- Heuristics:
  - **Positions**: headers include `Quantity`, `Price`, `Market Value`
  - **Transactions**: headers include `Date`, `Description`, `Amount`  
  - **Fees**: any header contains `Fee`, `Commission`, `Expense Ratio`
- Captures provenance `[pageIndex, tableIndex, rowIndex]` per row

### 4. Provenance & CSV Export
- Stores `{ pageIndex, tableIndex, rowIndex, html }` with each row
- Clicking a row shows original table slice
- CSV export includes provenance columns
- Supports partial page processing via `startPage`/`endPage`

## Key Advantages

### Why Cardinal vs Generic OCR/LLM
- **Preserves structure**: Complex tables, merged cells, layout intact
- **Lower hallucination risk**: Structured extraction vs free-form LLM
- **HTML tables by default**: Maximum fidelity for financial data
- **Dense table detection**: Handles complex brokerage statements

### Scale Features
- Large PDFs via `fileUrl` (no file size limits)
- Autoscaling infrastructure
- Retry logic and `failed_pages` handling
- Eval dashboard (`dashboard_url`) for quality assurance

## Quick Start Checklist
- [x] Add `CARDINAL_API_KEY` to Vercel env
- [x] Wire three API routes with Cardinal integration
- [x] Implement normalization util + CSV exporter
- [x] UI: Summary (Extract), Tables/CSV (normalization), Provenance (HTML), Compare (dashboard_url)

## File Structure
```
src/
├── lib/
│   ├── cardinal.ts          # Cardinal API config & types
│   ├── normalizer.ts        # Table parsing & CSV export
│   └── api.ts              # Frontend API helpers
└── app/api/card/
    ├── upload/route.ts      # Markdown extraction
    ├── extract/route.ts     # Header extraction  
    └── compare/route.ts     # Eval dashboard
```

## Usage
1. Upload PDF via file or URL
2. Cardinal extracts tables with provenance
3. Normalizer classifies into positions/transactions/fees
4. Export CSV with full provenance tracking
5. Click "Run Compare" to open Cardinal's eval dashboard
