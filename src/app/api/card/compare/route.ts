import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS, headers, CardinalCompareResponse } from "@/lib/cardinal";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, file, dense = true } = await req.json();

    if (!fileUrl && !file) {
      return NextResponse.json(
        { error: 'No file or URL provided' },
        { status: 400 }
      );
    }

    const form = new FormData();
    
    if (fileUrl) {
      form.append("fileUrl", fileUrl);
    } else if (file) {
      form.append("file", file);
    }
    
    form.append("densePdfDetect", String(dense));
    form.append("markdown", "false");
    // optional: form.append("originalResults", JSON.stringify(baselineMarkdown));

    const res = await fetch(ENDPOINTS.COMPARE, {
      method: "POST",
      headers,
      body: form,
    });
    
    if (!res.ok) {
      throw new Error(`Cardinal API error: ${res.status} ${res.statusText}`);
    }
    
    const json: CardinalCompareResponse = await res.json();
    return NextResponse.json(json);
  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json(
      { error: 'Failed to run comparison' },
      { status: 500 }
    );
  }
}
