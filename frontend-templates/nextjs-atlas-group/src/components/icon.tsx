import {
  Building2,
  Compass,
  FileCheck2,
  Globe,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon fields store a Lucide icon name as plain text (e.g. "Globe").
 * Only the names actually used by seeded content need to be registered
 * here; unknown names fall back to a compass glyph rather than crashing.
 */
const registry: Record<string, LucideIcon> = {
  Building2,
  Compass,
  FileCheck2,
  Globe,
  Handshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Truck,
};

type IconProps = {
  name?: string | null;
  className?: string;
};

export function Icon({ name, className }: IconProps) {
  const Component = (name && registry[name]) || Compass;
  return <Component className={className} aria-hidden="true" />;
}
