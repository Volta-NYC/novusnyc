"use client";

import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { MapPinIcon } from "@/components/Icons";

type HomeProject = {
  name: string;
  type: string;
  neighborhood: string;
  services: string[];
  status: "Ongoing" | "Upcoming" | "Completed";
  colorClass: string;
  url?: string;
  imageUrl?: string;
  desc?: string;
  quote?: string;
};

function getServiceTagClass(service: string): string {
  const key = service.trim().toLowerCase();
  if (key.includes("website") || key.includes("seo") || key.includes("google")) {
    return "bg-n-purple/20 text-n-ink border-n-purple/40";
  }
  if (key.includes("social")) {
    return "bg-n-orange/20 text-n-ink border-n-orange/40";
  }
  if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
    return "bg-n-yellow/40 text-n-ink border-n-yellow";
  }
  return "bg-n-border text-n-muted border-n-border";
}

function ProjectCard({ project, index }: { project: HomeProject; index: number }) {
  const card = (
    <div className="bg-n-bg border border-n-border rounded-2xl overflow-hidden project-card flex flex-col">
      <div className={`${project.colorClass} h-2`} />
      {project.imageUrl ? (
        <div className="mx-4 mt-5 rounded-xl border border-n-border bg-white overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={`Preview of ${project.name}, a ${project.type.toLowerCase()} project in ${project.neighborhood}`}
            width={1600}
            height={1000}
            sizes="82vw"
            className="block w-full h-auto"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="mx-4 mt-5 rounded-xl border border-n-border bg-white h-36 flex items-center justify-center">
          <span className="font-body text-xs text-n-muted uppercase tracking-wider">Project photo coming soon</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex gap-2 flex-wrap">
            {project.services.map((service) => (
              <span key={`${project.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
            ))}
          </div>
          <span className={`tag text-xs flex-shrink-0 ${project.status === "Completed" ? "bg-n-orange/25 text-n-ink" : project.status === "Ongoing" ? "bg-n-purple/25 text-n-ink" : "bg-n-yellow/35 text-n-ink"}`}>
            {project.status}
          </span>
        </div>
        <h3 className="font-display font-bold text-n-ink text-xl mb-4">{project.name}</h3>
        {project.quote && (
          <blockquote className="mt-4 border-l-2 border-n-orange pl-3 font-body text-sm text-n-muted italic leading-relaxed">
            &ldquo;{project.quote}&rdquo;
          </blockquote>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="font-body text-xs text-n-muted flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {project.neighborhood}
          </p>
          {project.url && <span className="font-body text-xs font-semibold text-n-purple">View live site →</span>}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatedSection
      delay={index * 0.05}
      className={`scroll-reveal scroll-reveal-card scroll-reveal-${index % 3} shrink-0 w-[82vw] max-w-[360px]`}
    >
      {project.url ? (
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${project.name} live site`}
          className="block"
        >
          {card}
        </a>
      ) : card}
    </AnimatedSection>
  );
}

export default function HomeProjectMobileCarousel({ projects }: { projects: HomeProject[] }) {
  return (
    <div className="home-project-mobile-carousel sm:hidden">
      <div
        aria-label="Featured projects. Swipe left or right to explore."
        className="home-project-mobile-marquee -mx-5 overflow-x-auto overscroll-x-contain pb-3"
      >
        <p className="home-project-mobile-swipe-hint" aria-hidden="true">Swipe projects <span>→</span></p>
        <div className="home-project-mobile-track flex w-max items-start gap-4 px-5">
          {projects.map((project, index) => (
            <ProjectCard key={project.name} project={project} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
