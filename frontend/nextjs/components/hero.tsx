import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface HeroAction {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
}

export interface HeroProps {
  eyebrow?: string;
  titleTop: React.ReactNode;
  titleBottom: React.ReactNode;
  description: string;
  actions?: HeroAction[];
  imageSrc: string;
  imageAlt: string;
}

/**
 * Reusable marketing Hero for the Clucky customer app.
 * Uses the `.hero` design tokens defined in `app/globals.css`.
 */
export function Hero({
  eyebrow = 'Fresh from the fryer',
  titleTop,
  titleBottom,
  description,
  actions = [],
  imageSrc,
  imageAlt,
}: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} className="inline mr-2 text-[#C9A227]" />
            {eyebrow}
          </span>
          <h1>
            <span>{titleTop}</span>
            <span>{titleBottom}</span>
          </h1>
          <p>{description}</p>
          {actions.length > 0 && (
            <div className="actions">
              {actions.map((action) => (
                <Link
                  key={action.href + action.label}
                  className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
                  href={action.href}
                >
                  <span>{action.label}</span>
                  {action.variant !== 'secondary' && <ArrowRight size={18} />}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="hero-food">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={560}
            height={440}
            priority
            style={{ width: '100%', height: 'auto', borderRadius: 28, objectFit: 'cover' }}
          />
        </div>
      </div>
    </section>
  );
}

export default Hero;

