import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      username: "radiomarconi_",
      followers: 346,
      fetched_at: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate"
      }
    }
  );
}