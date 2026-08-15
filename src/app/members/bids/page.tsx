import { permanentRedirect } from "next/navigation";

export default function LegacyPartnerOrganizationsPage() {
  permanentRedirect("/members/orgs");
}
