import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCaller } from "@/lib/server/adminApi";

const PUBLIC_PATHS = ["/", "/showcase", "/about", "/join"];

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }

  return NextResponse.json({ success: true, revalidated: PUBLIC_PATHS });
}
