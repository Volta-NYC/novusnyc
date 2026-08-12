interface HomeScrollBridgeProps {
  eyebrow: string;
  title: string;
  detail: string;
  imageSrc: string;
  index: number;
}

export default function HomeScrollBridge({
  eyebrow,
  title,
  detail,
  imageSrc,
  index,
}: HomeScrollBridgeProps) {
  return (
    <section
      className={`home-scroll-bridge home-scroll-bridge-${index}`}
      style={{ backgroundImage: `url(${imageSrc})` }}
    >
      <div
        aria-hidden="true"
        className="home-scroll-bridge-mobile-media"
        style={{ backgroundImage: `url(${imageSrc})` }}
      />
      <div className="home-scroll-bridge-copy">
        <p className="home-scroll-bridge-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
    </section>
  );
}
