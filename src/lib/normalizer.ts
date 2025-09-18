import { CardinalMarkdownResponse, NormalizedData, TableRow } from './cardinal';

// Lightweight HTML parser for table extraction
function parseHTMLTable(html: string): { headers: string[], rows: string[][] } {
  // Simple regex-based HTML table parser
  const headerMatch = html.match(/<th[^>]*>(.*?)<\/th>/gi);
  const headers = headerMatch ? headerMatch.map(h => h.replace(/<[^>]*>/g, '').trim()) : [];
  
  const rowMatches = html.match(/<tr[^>]*>(.*?)<\/tr>/gi);
  const rows: string[][] = [];
  
  if (rowMatches) {
    for (const row of rowMatches) {
      const cellMatches = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi);
      if (cellMatches) {
        const cells = cellMatches.map(cell => cell.replace(/<[^>]*>/g, '').trim());
        rows.push(cells);
      }
    }
  }
  
  return { headers, rows };
}

// Table classification heuristics
function classifyTable(headers: string[]): 'positions' | 'transactions' | 'fees' | 'unknown' {
  const headerText = headers.join(' ').toLowerCase();
  
  // Positions: Quantity, Price, Market Value
  if (headerText.includes('quantity') && (headerText.includes('price') || headerText.includes('market value'))) {
    return 'positions';
  }
  
  // Transactions: Date, Description, Amount
  if (headerText.includes('date') && (headerText.includes('description') || headerText.includes('amount'))) {
    return 'transactions';
  }
  
  // Fees: Fee, Commission, Expense Ratio
  if (headerText.includes('fee') || headerText.includes('commission') || headerText.includes('expense ratio')) {
    return 'fees';
  }
  
  return 'unknown';
}

// Normalize table data with provenance
function normalizeTable(
  headers: string[], 
  rows: string[][], 
  pageIndex: number, 
  tableIndex: number
): TableRow[] {
  return rows.map((row, rowIndex) => {
    const data: Record<string, string> = {};
    
    // Map row data to headers
    headers.forEach((header, index) => {
      data[header] = row[index] || '';
    });
    
    return {
      data,
      provenance: {
        pageIndex,
        tableIndex,
        rowIndex,
        html: `<table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr><tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr></table>`
      }
    };
  });
}

// Main normalization function
export function normalizeCardinalData(response: CardinalMarkdownResponse): NormalizedData {
  const normalized: NormalizedData = {
    positions: [],
    transactions: [],
    fees: []
  };
  
  response.pages.forEach((page, pageIndex) => {
    page.processed_tables.forEach((tableHtml, tableIndex) => {
      const { headers, rows } = parseHTMLTable(tableHtml);
      
      if (headers.length === 0 || rows.length === 0) return;
      
      const tableType = classifyTable(headers);
      const normalizedRows = normalizeTable(headers, rows, pageIndex, tableIndex);
      
      switch (tableType) {
        case 'positions':
          normalized.positions.push(...normalizedRows);
          break;
        case 'transactions':
          normalized.transactions.push(...normalizedRows);
          break;
        case 'fees':
          normalized.fees.push(...normalizedRows);
          break;
        default:
          // For unknown tables, try to infer from content
          const firstRow = rows[0];
          if (firstRow && firstRow.some(cell => cell.includes('$'))) {
            // Likely financial data, add to positions as fallback
            normalized.positions.push(...normalizedRows);
          }
      }
    });
  });
  
  return normalized;
}

// CSV export utilities
export function exportToCSV(data: TableRow[], filename: string): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0].data);
  const csvHeaders = [...headers, 'page_index', 'table_index', 'row_index'];
  
  const csvRows = data.map(row => {
    const values = headers.map(header => {
      const value = row.data[header] || '';
      // Escape CSV values
      return value.includes(',') || value.includes('"') || value.includes('\n') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    });
    
    return [...values, row.provenance.pageIndex, row.provenance.tableIndex, row.provenance.rowIndex];
  });
  
  return [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
}

// Generate download URL for CSV
export function generateCSVDownload(csvContent: string, filename: string): string {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  return URL.createObjectURL(blob);
}
