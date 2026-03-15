import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";

const HARDCODED_TEAMS: Record<string, string> = {
  "alvin jiang": "Reports",
  "joseph long": "Reports",
  "shafeen basher": "Reports",
  "bruce weng": "Reports",
  "tsundruk norbu": "Reports",
  "yuba bhatta": "Reports",
  "peyton yuen": "Reports",
  "nafis mahim": "Outreach",
  "tyler tong": "Outreach",
  "walter zhu": "Outreach",
  "michaela madanire": "Outreach",
  "ashley mui": "Outreach",
  "jay thakkar": "Outreach",
  "emily zhao": "Outreach",
  "kevin lin": "Grants",
  "jacky wang": "Grants",
  "angeline chan": "Grants",
  "tiffany xu": "Grants",
  "ryan liu": "Grants",
  "eddie shah": "T1",
  "maahika chitagi": "T1",
  "shokhjakhon samiev": "T1",
  "aarav sharma": "T2",
  "arnob paul": "T2",
  "batuhan sekeroglu": "T2",
  "ronghe guo": "T3",
  "peter predolac": "T3",
  "xiang li": "T3",
  "akhil rao": "T4",
  "mohammad ehan khan": "T4",
  "nelson guo": "T4",
};

function normalizeKey(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    getAdminAuth();
    const decoded = await getAuth().verifyIdToken(token);
    const { role } = decoded;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const db = getFirestore();
    const teamSnap = await db.collection("members_team").get();
    
    let updatedCount = 0;
    const batch = db.batch();

    teamSnap.docs.forEach((doc) => {
      const data = doc.data();
      const nameKey = normalizeKey(data.name || "");
      const newPod = HARDCODED_TEAMS[nameKey];
      
      if (newPod && data.pod !== newPod) {
        batch.update(doc.ref, { pod: newPod });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
