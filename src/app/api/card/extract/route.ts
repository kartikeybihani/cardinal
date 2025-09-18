import { NextRequest, NextResponse } from "next/server";
import { ENDPOINTS, headers, CardinalExtractResponse } from "@/lib/cardinal";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, file } = await req.json();

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
    
    form.append("fast", "true"); // fast path is OK for headers
    form.append(
      "schema",
      JSON.stringify({
        account_number: "string",
        statement_period_start: "string",
        statement_period_end: "string",
        ending_value: "number",
        total_fees: "number",
      })
    );

    const res = await fetch(ENDPOINTS.EXTRACT, {
      method: "POST",
      headers,
      body: form,
    });
    
    if (!res.ok) {
      throw new Error(`Cardinal API error: ${res.status} ${res.statusText}`);
    }
    
    const json: CardinalExtractResponse = await res.json();
    
    // Parse the response string
    const parsedResponse = JSON.parse(json.response);
    
    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json(
      { error: 'Failed to extract header data' },
      { status: 500 }
    );
  }
}
