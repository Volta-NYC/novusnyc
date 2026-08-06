type FaqItem = {
  q: string;
  a: string;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const CATEGORY_ACCENTS = [
  { text: "text-n-orange", border: "border-n-orange", open: "group-open:border-n-orange group-open:text-n-orange" },
  { text: "text-n-purple", border: "border-n-purple", open: "group-open:border-n-purple group-open:text-n-purple" },
  { text: "text-amber-600", border: "border-n-yellow", open: "group-open:border-n-yellow group-open:text-amber-600" },
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
          <div className={`border-y border-n-border border-l-2 pl-4 ${accent.border}`}>
            {category.items.map((item) => (
              <details key={item.q} className="group border-b border-n-border last:border-b-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-1 py-5 font-display text-base font-bold text-n-ink marker:content-none">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-n-border font-body text-lg font-normal leading-none text-n-muted transition-transform duration-200 group-open:rotate-45 ${accent.open}`}
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-3xl px-1 pb-5 font-body text-sm leading-relaxed text-n-muted">
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
