import { KIND_TONE, type PublicPartnership } from "@/data/partnerships";
import PartnerDetail from "./PartnerDetail";

const GROUPS: { title: string; match: (partner: PublicPartnership) => boolean }[] = [
  { title: "Chambers and business organizations", match: (partner) => KIND_TONE[partner.kind] === "purple" },
  { title: "Business Improvement Districts, development and merchant organizations", match: (partner) => KIND_TONE[partner.kind] === "orange" },
];

// The map is the visual version of this list. The list stays in the
// accessibility tree as its text equivalent and as the target of #id links.
export default function PartnerDirectory({ partners }: { partners: PublicPartnership[] }) {
  const byId = new Map(partners.map((partner) => [partner.id, partner]));
  const ordered = (members: PublicPartnership[]) =>
    [...members].sort((a, b) => (a.depth === b.depth ? 0 : a.depth === "deep" ? -1 : 1));

  return (
    <section id="organizations" aria-labelledby="organizations-heading" className="sr-only">
      <h2 id="organizations-heading">The organizations</h2>
      {GROUPS.map((group) => (
        <div key={group.title}>
          <h3>{group.title}</h3>
          <ul>
            {ordered(partners.filter(group.match)).map((partner) => (
              <li key={partner.id} id={partner.id}>
                <PartnerDetail partner={partner} partnersById={byId} surface="light" headingLevel="h4" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
