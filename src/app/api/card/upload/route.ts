import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS, headers, CardinalMarkdownResponse } from "@/lib/cardinal";
import { logVercel, logError } from "@/lib/logger";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const form = new FormData();

    if (contentType.includes("multipart/form-data")) {
      const data = await req.formData();
      const file = data.get("file") as File | null;
      const fileUrl = data.get("fileUrl") as string | null;
      
      if (file) form.append("file", file);
      if (fileUrl) form.append("fileUrl", fileUrl);
    } else {
      const { fileUrl } = await req.json();
      if (fileUrl) form.append("fileUrl", fileUrl);
    }

    // Fidelity first: keep tables as HTML; enable dense table detection
    form.append("densePdfDetect", "true");
    form.append("markdown", "false");

    logVercel('Making request to Cardinal API', { endpoint: ENDPOINTS.MARKDOWN, headers });
    
    const res = await fetch(ENDPOINTS.MARKDOWN, { 
      method: "POST", 
      headers, 
      body: form 
    });
    
    logVercel('Cardinal API response status', { status: res.status, statusText: res.statusText });
    
    if (!res.ok) {
      const errorText = await res.text();
      logError('Cardinal API error response', { status: res.status, errorText });
      throw new Error(`Cardinal API error: ${res.status} ${res.statusText}`);
    }
    
    const json: CardinalMarkdownResponse = await res.json();
    
    // Log the complete Cardinal API response
    logVercel('Cardinal API response received', {
      status: json.status,
      message: json.message,
      pagesCount: json.pages?.length || 0,
      pages: json.pages?.map((page, index) => ({
        pageIndex: page.pageIndex,
        textLength: page.text?.length || 0,
        tablesCount: page.processed_tables?.length || 0,
        firstTablePreview: page.processed_tables?.[0]?.substring(0, 200) + '...' || 'No tables'
      }))
    });
    
    return NextResponse.json(json);
  } catch (error) {
    logError('Upload error occurred', error);
    return NextResponse.json(
      { error: 'Failed to process files' },
      { status: 500 }
    );
  }
}

