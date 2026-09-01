"use client";

import { useState, useEffect } from "react";
import { CheckIcon } from "@/components/Icons";
import Combobox from "@/components/Combobox";
import { validateContactForm, type ContactFormValues } from "@/lib/schemas";
import { EMAIL } from "@/lib/mail";
import { trackEvent, GA_EVENTS } from "@/lib/analytics";

type Lang = "en" | "es" | "zh" | "ko" | "ar" | "fr";

const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  es: "Español",
  zh: "中文",
  ko: "한국어",
  ar: "العربية",
  fr: "Français",
};
const LANG_ORDER: Lang[] = ["en", "es", "fr", "zh", "ko", "ar"];

const SERVICES_BY_LANG: Record<Lang, string[]> = {
  en: ["Website Design & Development", "Social Media & Content", "Graphic Design", "Grant Research & Writing", "SEO & Google Maps Visibility", "Sales & Financial Analysis", "Other"],
  es: ["Diseño y desarrollo web", "Redes sociales y contenido", "Diseño gráfico", "Investigación y redacción de becas", "SEO y visibilidad en Google Maps", "Análisis de ventas y finanzas", "Otro"],
  zh: ["网站设计与开发", "社交媒体与内容", "平面设计", "助款研究与撰写", "SEO与谷歌地图优化", "销售与财务分析", "其他"],
  ko: ["웹사이트 디자인 및 개발", "소셜 미디어 및 콘텐츠", "그래픽 디자인", "보조금 연구 및 작성", "SEO 및 구글 지도 가시성", "매출 및 재무 분석", "기타"],
  ar: ["تصميم وتطوير المواقع", "وسائل التواصل الاجتماعي والمحتوى", "التصميم الجرافيكي", "البحث عن المنح وكتابتها", "تحسين محركات البحث وخرائط جوجل", "تحليل المبيعات والمالية", "أخرى"],
  fr: ["Conception et développement web", "Médias sociaux et contenu", "Design graphique", "Recherche et rédaction de subventions", "Référencement et visibilité Google Maps", "Analyse des ventes et finances", "Autre"],
};

const COPY: Record<Lang, {
  businessName: string; ownerName: string; email: string; phone: string; neighborhood: string;
  services: string; referredBy: string; referredByPlaceholder: string; referredByDetail: string; referredByDetailPlaceholder: string; message: string; messagePlaceholder: string; submit: string;
  submitting: string; successTitle: string; successBody: string; errorMsg: string;
  footerNote: string; dir: "ltr" | "rtl";
}> = {
  en: { businessName: "Business Name *", ownerName: "Your Name *", email: "Email *", phone: "Phone Number", neighborhood: "Neighborhood", services: "What do you need help with?", referredBy: "Who referred you?", referredByPlaceholder: "Choose from the list, or type your own", referredByDetail: "Which one?", referredByDetailPlaceholder: "e.g. Instagram, a neighbor, a specific flyer…", message: "Tell us more", messagePlaceholder: "What's your biggest challenge right now?", submit: "Send Message", submitting: "Sending…", successTitle: "Got it. We'll be in touch.", successBody: "We'll review your submission and reach out within 2–3 business days.", errorMsg: `Something went wrong. Email us at ${EMAIL.info}`, footerNote: "We typically respond within 2–3 business days. Our services are 100% free.", dir: "ltr" },
  es: { businessName: "Nombre del negocio *", ownerName: "Su nombre *", email: "Correo electrónico *", phone: "Número de teléfono", neighborhood: "Vecindario", services: "¿Con qué necesita ayuda?", referredBy: "¿Quién lo refirió?", referredByPlaceholder: "Elija de la lista o escriba el suyo", referredByDetail: "¿Cuál?", referredByDetailPlaceholder: "ej. Instagram, un vecino, un volante específico…", message: "Cuéntenos más", messagePlaceholder: "¿Cuál es su mayor desafío ahora mismo?", submit: "Enviar mensaje", submitting: "Enviando…", successTitle: "Recibido. Nos pondremos en contacto.", successBody: "Revisaremos su solicitud y le responderemos en 2–3 días hábiles.", errorMsg: `Algo salió mal. Escríbanos a ${EMAIL.info}`, footerNote: "Generalmente respondemos en 2–3 días hábiles. Nuestros servicios son 100% gratuitos.", dir: "ltr" },
  zh: { businessName: "商户名称 *", ownerName: "您的姓名 *", email: "电子邮件 *", phone: "电话号码", neighborhood: "所在社区", services: "您需要哪方面的帮助？", referredBy: "谁推荐了您？", referredByPlaceholder: "从列表中选择，或自行输入", referredByDetail: "具体是哪一个？", referredByDetailPlaceholder: "例如：Instagram、邻居、某张传单……", message: "请告诉我们更多", messagePlaceholder: "您目前面临的最大挑战是什么？", submit: "发送消息", submitting: "发送中…", successTitle: "已收到。我们会尽快联系您。", successBody: "我们将审核您的提交，并在 2–3 个工作日内回复您。", errorMsg: `出现错误。请发送邮件至 ${EMAIL.info}`, footerNote: "我们通常在 2–3 个工作日内回复。我们的服务完全免费。", dir: "ltr" },
  ko: { businessName: "사업체명 *", ownerName: "성함 *", email: "이메일 *", phone: "전화번호", neighborhood: "동네", services: "어떤 도움이 필요하신가요?", referredBy: "누구에게 소개받으셨나요?", referredByPlaceholder: "목록에서 선택하거나 직접 입력하세요", referredByDetail: "어느 쪽인가요?", referredByDetailPlaceholder: "예: 인스타그램, 이웃, 특정 전단지…", message: "더 알려주세요", messagePlaceholder: "현재 가장 어려운 점은 무엇인가요?", submit: "메시지 보내기", submitting: "전송 중…", successTitle: "접수되었습니다. 곧 연락드리겠습니다.", successBody: "제출하신 내용을 검토하고 영업일 기준 2–3일 이내에 연락드리겠습니다.", errorMsg: `오류가 발생했습니다. ${EMAIL.info} 으로 이메일 보내주세요.`, footerNote: "보통 영업일 기준 2–3일 이내에 답변드립니다. 모든 서비스는 무료입니다.", dir: "ltr" },
  ar: { businessName: "اسم النشاط التجاري *", ownerName: "اسمك *", email: "البريد الإلكتروني *", phone: "رقم الهاتف", neighborhood: "الحي", services: "ما الذي تحتاج إلى مساعدة فيه؟", referredBy: "من أحالك إلينا؟", referredByPlaceholder: "اختر من القائمة أو اكتب إجابتك", referredByDetail: "أي واحدة؟", referredByDetailPlaceholder: "مثل: إنستغرام، جار، منشور معيّن…", message: "أخبرنا المزيد", messagePlaceholder: "ما هو أكبر تحديك الآن؟", submit: "إرسال الرسالة", submitting: "جارٍ الإرسال…", successTitle: "تم الاستلام. سنتواصل معك قريبًا.", successBody: "سنراجع طلبك ونتواصل معك خلال يومي عمل إلى ثلاثة أيام عمل.", errorMsg: `حدث خطأ ما. راسلنا على ${EMAIL.info}`, footerNote: "نرد عادةً خلال يومي عمل إلى ثلاثة أيام عمل. خدماتنا مجانية 100%.", dir: "rtl" },
  fr: { businessName: "Nom de l'entreprise *", ownerName: "Votre nom *", email: "E-mail *", phone: "Numéro de téléphone", neighborhood: "Quartier", services: "De quoi avez-vous besoin ?", referredBy: "Qui vous a recommandé ?", referredByPlaceholder: "Choisissez dans la liste ou saisissez la vôtre", referredByDetail: "Laquelle ?", referredByDetailPlaceholder: "ex. Instagram, un voisin, un flyer précis…", message: "Dites-nous en plus", messagePlaceholder: "Quel est votre plus grand défi en ce moment ?", submit: "Envoyer le message", submitting: "Envoi en cours…", successTitle: "Reçu. Nous vous recontacterons.", successBody: "Nous examinerons votre demande et vous répondrons sous 2 à 3 jours ouvrés.", errorMsg: `Une erreur s'est produite. Écrivez-nous à ${EMAIL.info}`, footerNote: "Nous répondons généralement sous 2 à 3 jours ouvrés. Nos services sont 100% gratuits.", dir: "ltr" },
};

// Referral options that are categories rather than a named source. Picking one
// answers "how" but not "who", so each triggers a follow-up field — otherwise
// a quarter of submissions arrive saying only "Other".
const REFERRAL_GENERIC = [
  "Social media",
  "Online search / Google",
  "Flyer or printed material",
  "Other",
] as const;

function isGenericReferral(value: string): boolean {
  return (REFERRAL_GENERIC as readonly string[]).includes(value.trim());
}

// "Social media" alone is not a referral source anyone can act on. Storing the
// bucket and the detail as one string keeps the existing referred_by column
// usable — filterable by bucket, still readable as a sentence.
function composeReferral(value: string, detail: string): string {
  const base = value.trim();
  const extra = detail.trim();
  if (!base) return "";
  if (!extra || !isGenericReferral(base)) return base;
  return `${base} — ${extra}`;
}

const EMPTY: ContactFormValues = {
  businessName: "", name: "", email: "", phone: "", neighborhood: "", services: [], referredBy: "", message: "",
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1 font-body text-xs text-red-500">{message}</p>;
}

export default function ContactForm() {
  const [lang, setLang] = useState<Lang>("en");
  const [formData, setFormData] = useState<ContactFormValues>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [partnerOptions, setPartnerOptions] = useState<string[]>([]);
  const [referredByDetail, setReferredByDetail] = useState("");

  useEffect(() => {
    fetch("/api/public/neighborhoods")
      .then((r) => r.json())
      .then((data: { neighborhoods?: string[] }) => {
        if (Array.isArray(data.neighborhoods)) setNeighborhoodOptions(data.neighborhoods);
      })
      .catch(() => { /* non-fatal */ });
    fetch("/api/public/org-partners")
      .then((r) => r.json())
      .then((data: { partners?: string[] }) => {
        if (Array.isArray(data.partners)) setPartnerOptions(data.partners);
      })
      .catch(() => { /* non-fatal */ });
  }, []);

  const c = COPY[lang];
  const serviceList = SERVICES_BY_LANG[lang];

  const toggleService = (s: string) =>
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(s)
        ? prev.services.filter((x) => x !== s)
        : [...prev.services, s],
    }));

  const clearError = (k: string) =>
    setErrors((p) => { const next = { ...p }; delete next[k]; return next; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateContactForm(formData);
    if (!result.success) {
      setErrors(result.errors);
      window.setTimeout(() => {
        document.querySelector<HTMLElement>("#partner-contact-form [aria-invalid='true']")?.focus();
      });
      return;
    }
    setErrors({});
    setStatus("loading");

    // Translate selected services back to English using the array index,
    // regardless of which language the user submitted the form in.
    const englishServices = formData.services.map((s) => {
      const idx = serviceList.indexOf(s);
      return idx >= 0 ? SERVICES_BY_LANG["en"][idx] : s;
    }).join(", ");

    // Send via server-side proxy to avoid CORS issues with Apps Script.
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType:     "contact",
          businessName: formData.businessName,
          name:         formData.name,
          email:        formData.email,
          phone:        formData.phone,
          neighborhood: formData.neighborhood,
          services:     englishServices,
          referredBy:   composeReferral(formData.referredBy, referredByDetail),
          message:      formData.message,
          language:     LANG_LABELS[lang],
        }),
      });
      if (!res.ok) throw new Error("submit_failed");
      setStatus("success");
      // Fired only after the API confirms the write, so this counts real
      // submissions rather than attempts. `lang` separates the six
      // translations, which is the point of the form being multilingual.
      trackEvent(GA_EVENTS.contactSubmitted, { lang });
      setFormData(EMPTY);
      setReferredByDetail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div role="status" aria-live="polite" className="bg-white border border-n-border rounded-2xl p-10 text-center" dir={c.dir} lang={lang}>
        <div aria-hidden="true" className="w-14 h-14 rounded-full bg-n-orange/20 flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="w-7 h-7 text-n-orange" />
        </div>
        <h3 className="font-display font-bold text-2xl text-n-ink mb-3">{c.successTitle}</h3>
        <p className="font-body text-n-muted">{c.successBody}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Language toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LANG_ORDER.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => {
              // Preserve selections by index so switching language keeps the
              // same items checked (e.g. slot 2 in EN maps to slot 2 in ES).
              setFormData((p) => {
                const oldList = SERVICES_BY_LANG[lang];
                const newList = SERVICES_BY_LANG[l];
                const preserved = p.services
                  .map((s) => oldList.indexOf(s))
                  .filter((i) => i >= 0 && i < newList.length)
                  .map((i) => newList[i]);
                return { ...p, services: preserved };
              });
              setLang(l);
              setErrors({});
            }}
            className={`px-4 py-1.5 rounded-full border font-body text-sm font-medium transition-all ${lang === l ? "bg-n-ink text-white border-n-ink" : "bg-white border-n-border text-n-muted hover:border-n-ink"}`}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
      </div>

      <form id="partner-contact-form" onSubmit={handleSubmit} noValidate className="bg-white border border-n-border rounded-2xl p-8 md:p-10 space-y-5" dir={c.dir} lang={lang}>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="contact-business-name" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.businessName}</label>
            <input
              id="contact-business-name"
              autoComplete="organization"
              value={formData.businessName}
              aria-invalid={Boolean(errors.businessName)}
              aria-describedby={errors.businessName ? "contact-business-name-error" : undefined}
              onChange={(e) => { setFormData((p) => ({ ...p, businessName: e.target.value })); clearError("businessName"); }}
              className={`novus-input ${errors.businessName ? "border-red-400" : ""}`}
            />
            <FieldError id="contact-business-name-error" message={errors.businessName} />
          </div>
          <div>
            <label htmlFor="contact-owner-name" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.ownerName}</label>
            <input
              id="contact-owner-name"
              autoComplete="name"
              value={formData.name}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "contact-owner-name-error" : undefined}
              onChange={(e) => { setFormData((p) => ({ ...p, name: e.target.value })); clearError("name"); }}
              className={`novus-input ${errors.name ? "border-red-400" : ""}`}
            />
            <FieldError id="contact-owner-name-error" message={errors.name} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="contact-email" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.email}</label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              value={formData.email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              onChange={(e) => { setFormData((p) => ({ ...p, email: e.target.value })); clearError("email"); }}
              className={`novus-input ${errors.email ? "border-red-400" : ""}`}
            />
            <FieldError id="contact-email-error" message={errors.email} />
          </div>
          <div>
            <label htmlFor="contact-phone" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.phone}</label>
            <input
              id="contact-phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
              className="novus-input"
            />
          </div>
          <div>
            <label htmlFor="contact-neighborhood" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.neighborhood}</label>
            <Combobox
              id="contact-neighborhood"
              theme="light"
              value={formData.neighborhood}
              onChange={(next) => setFormData((p) => ({ ...p, neighborhood: next }))}
              options={neighborhoodOptions}
              placeholder="Start typing"
            />
          </div>
        </div>
        <fieldset>
          <legend className="block font-body text-sm font-semibold text-n-ink mb-3">{c.services}</legend>
          <div className="flex flex-wrap gap-2">
            {serviceList.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={formData.services.includes(s)}
                onClick={() => toggleService(s)}
                className={`text-sm font-body font-medium px-4 py-2 rounded-full border transition-all ${formData.services.includes(s) ? "bg-n-orange border-n-orange text-n-ink" : "bg-white border-n-border text-n-muted hover:border-n-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="contact-referred-by" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.referredBy}</label>
          <Combobox
            id="contact-referred-by"
            theme="light"
            value={formData.referredBy}
            onChange={(next) => {
              setFormData((p) => ({ ...p, referredBy: next }));
              if (!isGenericReferral(next)) setReferredByDetail("");
            }}
            options={[...partnerOptions, ...REFERRAL_GENERIC]}
            placeholder={c.referredByPlaceholder}
            showOnEmpty
          />
          {isGenericReferral(formData.referredBy) && (
            <div className="mt-3">
              <label htmlFor="contact-referred-by-detail" className="block font-body text-sm font-semibold text-n-ink mb-2">
                {c.referredByDetail}
              </label>
              <input
                id="contact-referred-by-detail"
                type="text"
                value={referredByDetail}
                onChange={(e) => setReferredByDetail(e.target.value)}
                className="novus-input"
                placeholder={c.referredByDetailPlaceholder}
              />
            </div>
          )}
        </div>
        <div>
          <label htmlFor="contact-message" className="block font-body text-sm font-semibold text-n-ink mb-2">{c.message}</label>
          <textarea
            id="contact-message"
            value={formData.message}
            onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
            className="novus-input resize-none"
            rows={4}
            placeholder={c.messagePlaceholder}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-n-orange text-n-ink font-display font-bold text-base py-4 rounded-xl hover:bg-n-orange-dark transition-colors disabled:opacity-60"
        >
          {status === "loading" ? c.submitting : c.submit}
        </button>
        {status === "error" && <p role="alert" className="text-red-500 text-sm text-center font-body">{c.errorMsg}</p>}
        <p className="text-xs text-n-muted text-center font-body">{c.footerNote}</p>
      </form>
    </div>
  );
}
