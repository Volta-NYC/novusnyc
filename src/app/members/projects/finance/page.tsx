import { redirect } from "next/navigation";

export default function LegacyFinanceAssignmentsRedirect() {
  redirect("/members/assignments");
}
