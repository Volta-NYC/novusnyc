type FaqItem = {
  q: string;
  a: string;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const CATEGORY_ACCENTS = [
  { text: "text-v-green", border: "border-v-green", open: "group-open:border-v-green group-open:text-v-green" },
  { text: "text-v-blue", border: "border-v-blue", open: "group-open:border-v-blue group-open:text-v-blue" },
  { text: "text-amber-600", border: "border-v-yellow", open: "group-open:border-v-yellow group-open:text-amber-600" },
];

export default function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  return (
    <div className="space-y-10">
      {categories.map((category, index) => {
        const accent = CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length];
        return (
        <section key={category.title} aria-labelledby={`faq-${category.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          <h3
            id={`faq-${category.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            className={`font-body text-xs font-semibold uppercase tracking-widest mb-3 ${accent.text}`}
          >
            {category.title}
          </h3>
          <div className={`border-y border-v-border border-l-2 pl-4 ${accent.border}`}>
            {category.items.map((item) => (
              <details key={item.q} className="group border-b border-v-border last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-1 py-5 font-display text-base font-bold text-v-ink marker:content-none">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-v-border font-body text-lg font-normal leading-none text-v-muted transition-transform duration-200 group-open:rotate-45 ${accent.open}`}
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl px-1 pb-5 font-body text-sm leading-relaxed text-v-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
        );
      })}
    </div>
  );
}
