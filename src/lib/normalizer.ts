import { CardinalMarkdownResponse, NormalizedData, TableRow, StatementData } from './cardinal';

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
export function exportToCSV(data: TableRow[]): string {
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
export function generateCSVDownload(csvContent: string): string {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  return URL.createObjectURL(blob);
}

// Convert Cardinal response to frontend format
export function convertCardinalToStatement(cardinalData: CardinalMarkdownResponse): StatementData {
  // For now, return mock data structure - in production, you'd parse the Cardinal response
  return {
    header: {
      accountNumber: "****1234",
      periodStart: "2024-01-01",
      periodEnd: "2024-01-31",
      endingValue: 125430.50,
      totalFees: 45.20
    },
    positions: [
      { symbol: "AAPL", description: "Apple Inc.", quantity: "100", price: "$150.25", value: "$15,025.00", assetClass: "Equity" },
      { symbol: "MSFT", description: "Microsoft Corp.", quantity: "50", price: "$300.10", value: "$15,005.00", assetClass: "Equity" }
    ],
    transactions: [
      { date: "2024-01-15", type: "Buy", symbol: "AAPL", quantity: "10", price: "$150.00", amount: "$1,500.00", fee: "$1.00" }
    ],
    fees: [
      { date: "2024-01-31", label: "Account Maintenance Fee", amount: "$10.00", category: "Account" }
    ],
    provenance: {
      pageIndex: 2,
      tableIndex: 1,
      rowIndex: 0,
      html: "<table><tr><td>AAPL</td><td>Apple Inc.</td><td>100</td><td>$150.25</td><td>$15,025.00</td></tr></table>"
    }
  };
}
