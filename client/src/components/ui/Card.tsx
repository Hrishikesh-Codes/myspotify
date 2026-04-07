import { useState } from "react";

interface TrackCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  index?: number;
}

export function TrackCard({ title, subtitle, imageUrl, index }: TrackCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="card card-hover p-3 cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative mb-3">
        <img
          src={imageUrl}
          alt={title}
          className="w-full aspect-square object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
        />
        {/* Purple overlay on hover */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        {hovered && (
          <div className="absolute bottom-2 right-2">
            <div className="play-btn w-10 h-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Top #1 badge */}
        {index === 0 && (
          <div className="absolute top-2 left-2 bg-accent-pink text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            #1
          </div>
        )}
      </div>

      <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
      <p className="text-xs text-text-tertiary truncate mt-0.5">{subtitle}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-3">
      <div className="skeleton w-full aspect-square rounded-lg mb-3" />
      <div className="skeleton h-3.5 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded" />
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold tracking-tight text-text-primary">{title}</h2>
      {actionLabel && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-text-tertiary hover:text-primary transition-colors uppercase tracking-wider"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
