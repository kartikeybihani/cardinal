import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS, headers, CardinalMarkdownResponse } from "@/lib/cardinal";

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

    console.log('Making request to Cardinal API:', ENDPOINTS.MARKDOWN);
    console.log('Headers:', headers);
    
    const res = await fetch(ENDPOINTS.MARKDOWN, { 
      method: "POST", 
      headers, 
      body: form 
    });
    
    console.log('Cardinal API response status:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Cardinal API error response:', errorText);
      throw new Error(`Cardinal API error: ${res.status} ${res.statusText}`);
    }
    
    const json: CardinalMarkdownResponse = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process files' },
      { status: 500 }
    );
  }
}

