import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCaller } from "@/lib/server/adminApi";
import { clearPublicShowcaseCache } from "@/lib/server/publicShowcase";

// Every statically-generated public page that reads the database. /apply was
// missing, so pausing applications or changing chapters stayed invisible until
// the next deploy.
const PUBLIC_PATHS = ["/", "/showcase", "/about", "/apply", "/join"];

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  clearPublicShowcaseCache();
  for (const path of PUBLIC_PATHS) {
    revalidatePath(path);
  }

  return NextResponse.json({ success: true, revalidated: PUBLIC_PATHS });
}
