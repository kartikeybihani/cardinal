/* eslint-disable no-console */
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
  // Log the Cardinal data being processed
  console.log('=== NORMALIZER INPUT ===');
  console.log('Cardinal data received:', cardinalData);
  console.log('Status:', cardinalData.status);
  console.log('Pages count:', cardinalData.pages?.length || 0);
  
  // Extract all tables from all pages
  interface TableData {
    pageIndex: number;
    tableIndex: number;
    data: unknown;
  }
  const allTables: TableData[] = [];
  if (cardinalData.pages) {
    cardinalData.pages.forEach((page, pageIndex) => {
      console.log(`Page ${pageIndex} details:`, {
        pageIndex: page.pageIndex,
        textPreview: page.text?.substring(0, 100) + '...',
        tablesCount: page.processed_tables?.length || 0,
        firstTableType: typeof page.processed_tables?.[0]
      });
      
      if (page.processed_tables && page.processed_tables.length > 0) {
        page.processed_tables.forEach((table, tableIndex) => {
          console.log(`Table ${tableIndex} on page ${pageIndex}:`, table);
          allTables.push({
            pageIndex,
            tableIndex,
            data: table
          });
        });
      }
    });
  }
  console.log('=== EXTRACTED TABLES ===', allTables);
  console.log('=== END NORMALIZER INPUT ===');
  
  // Parse the actual Cardinal data
  interface Position {
    symbol: string;
    description: string;
    quantity: string;
    price: string;
    value: string;
    assetClass: string;
  }
  interface Transaction {
    date: string;
    type: string;
    symbol: string;
    quantity: string;
    price: string;
    amount: string;
    fee: string;
  }
  interface Fee {
    date: string;
    label: string;
    amount: string;
    category: string;
  }
  const positions: Position[] = [];
  const transactions: Transaction[] = [];
  const fees: Fee[] = [];
  const accountInfo = {
    accountNumber: "Unknown",
    periodStart: "Unknown",
    periodEnd: "Unknown",
    endingValue: 0,
    totalFees: 0
  };
    
  // Extract data from tables
  allTables.forEach((tableData, index) => {
    const table = tableData.data as Record<string, unknown>;
    
    // Try to extract structured data from the table object
    if (table && typeof table === 'object') {
      console.log(`Processing table ${index}:`, table);
      
      // Look for different types of financial data
      // This is a basic parser - you'll need to adapt based on actual Cardinal table structure
      if (table.rows && Array.isArray(table.rows)) {
        table.rows.forEach((row: unknown) => {
          if ((row as Record<string, unknown>)?.cells && Array.isArray((row as Record<string, unknown>).cells)) {
            const cellTexts: string[] = ((row as Record<string, unknown>).cells as unknown[]).map((cell: unknown) => {
              if (typeof cell === 'string') return cell;
              const cellObj = cell as Record<string, unknown>;
              return String(cellObj?.text || cellObj?.value || '');
            });
            
            // Basic heuristics to classify rows
            const rowText = cellTexts.join(' ').toLowerCase();
            
            if (rowText.includes('symbol') || rowText.includes('ticker') || rowText.includes('security')) {
              // This might be a positions table header - skip
            } else if (cellTexts.length >= 4 && cellTexts.some((cell: string) => cell.includes('$'))) {
              // This looks like it could be a position or transaction
              positions.push({
                symbol: cellTexts[0] || 'Unknown',
                description: cellTexts[1] || 'Unknown Security',
                quantity: cellTexts[2] || '0',
                price: cellTexts[3] || '$0.00',
                value: cellTexts[4] || '$0.00',
                assetClass: 'Equity'
              });
            }
          }
        });
      }
      
      // Look for account information in table metadata or headers
      const title = table.title as string | undefined;
      const caption = table.caption as string | undefined;
      if (title || caption) {
        const titleText = String(title || caption || '').toLowerCase();
        if (titleText.includes('account')) {
          // Try to extract account number
          const accountMatch = titleText.match(/account[:\s]*(\d+)/i);
          if (accountMatch) {
            accountInfo.accountNumber = `****${accountMatch[1].slice(-4)}`;
          }
        }
      }
    }
  });
  
  // If no positions found from parsing, create a sample from the actual data
  if (positions.length === 0) {
    positions.push({
      symbol: "PARSED_DATA",
      description: `Found ${allTables.length} tables in PDF`,
      quantity: cardinalData.pages?.length.toString() || "0",
      price: "$0.00",
      value: "$0.00",
      assetClass: "Data"
    });
  }
  
  // Add some sample transactions based on what we found
  if (allTables.length > 0) {
    transactions.push({
      date: "2024-03-31",
      type: "Data Extract",
      symbol: "CARDINAL",
      quantity: allTables.length.toString(),
      price: "$0.00",
      amount: "$0.00",
      fee: "$0.00"
    });
  } 
  
  return {
    header: accountInfo,
    positions,
    transactions,
    fees,
    provenance: {
      pageIndex: allTables.length > 0 ? allTables[0].pageIndex : 0,
      tableIndex: allTables.length > 0 ? allTables[0].tableIndex : 0,
      rowIndex: 0,
      html: `Processed ${allTables.length} tables from Cardinal API`
    }
  };
}
