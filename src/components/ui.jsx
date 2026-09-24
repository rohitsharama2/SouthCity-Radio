import React from 'react';
import { Radio, Play, Heart, ArrowUpRight, X, Headphones, Music2 } from 'lucide-react';
export function Brand({ compact = false }) {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Radio size={23} />
      </span>
      {!compact && (
        <span>
          southcity<span className="brand-sub">RADIO, REIMAGINED.</span>
        </span>
      )}
    </div>
  );
}
export function IconButton({ label, children, className = '', ...props }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function LiveBadge({ dark = false }) {
  return (
    <span className={`live-badge ${dark ? 'dark' : ''}`}>
      <i /> LIVE
    </span>
  );
}
export function Artwork({ station, className = '' }) {
  return (
    <div
      className={`artwork art-${station.art} ${className}`}
      role="img"
      aria-label={`${station.name} artwork`}
    >
      {station.art === 'originals' && (
        <>
          <span className="art-top">FROM THE HEART OF THE CITY</span>
          <div className="art-word">
            south
            <br />
            city<span>originals.</span>
          </div>
          <div className="art-waves">◜◜◜◜</div>
          <span className="art-bottom">INDEPENDENT RADIO · EST. 2024</span>
        </>
      )}
      {station.art === 'jazz' && (
        <>
          <img
            src="https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=700&q=85"
            alt=""
          />
          <span className="art-top">THE CITY SOUNDS BETTER AT NIGHT</span>
          <div className="jazz-title">
            jazz<span>after hours</span>
          </div>
          <span className="art-bottom">A LITTLE SOUL. A LOT OF JAZZ.</span>
        </>
      )}
      {station.art === 'indie' && (
        <>
          <span className="art-top">SOUNDS FROM THE OTHER SIDE</span>
          <div className="indie-flower">✳</div>
          <div className="indie-title">
            indie
            <br />
            avenue<span>TAKE THE SCENIC ROUTE.</span>
          </div>
        </>
      )}
      {station.art === 'lofi' && (
        <>
          <img
            src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=700&q=85"
            alt=""
          />
          <span className="art-top">TUNE OUT. SETTLE IN.</span>
          <div className="lofi-title">
            lo-fi
            <br />
            <em>lounge</em>
          </div>
          <span className="art-bottom">YOUR LITTLE CORNER OF CALM</span>
        </>
      )}
      {station.art === 'soul' && (
        <>
          <div className="soul-disc" />
          <span className="art-top">FEEL SOMETHING GOOD</span>
          <div className="soul-title">
            soul &<br />
            the city.
          </div>
          <span className="art-bottom">RHYTHM FOR YOUR EVERYDAY</span>
        </>
      )}
      {station.art === 'electronic' && (
        <>
          <span className="art-top">INDEPENDENT ELECTRONIC RADIO</span>
          <div className="frequency-orbit" />
          <div className="electronic-title">
            FREQUENCY<span>/ 024</span>
          </div>
          <span className="art-bottom">ALWAYS IN MOTION</span>
        </>
      )}
    </div>
  );
}
export function StationCard({ station, onOpen, onPlay, onFavorite, isFavorite = false, index }) {
  return (
    <article className="station-card">
      <div className="station-art-wrap">
        <button
          className="art-link"
          onClick={() => onOpen(station)}
          aria-label={`View ${station.name}`}
        >
          <Artwork station={station} />
        </button>
        <LiveBadge />
        <button
          className="card-play"
          onClick={() => onPlay(station)}
          aria-label={`Play ${station.name}`}
        >
          <Play size={19} fill="currentColor" />
        </button>
        {onFavorite && (
          <button
            className={`card-favorite ${isFavorite ? 'is-favorite' : ''}`}
            onClick={() => onFavorite(station.id)}
            aria-label={`${isFavorite ? 'Unfollow' : 'Follow'} ${station.name}`}
          >
            <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <button className="station-title" onClick={() => onOpen(station)}>
        {index && <span className="rank">{index}</span>}
        {station.name}
      </button>
      <div className="station-meta">
        <span>
          {station.genre} <span className="dot">·</span> {station.language}
        </span>
        <span>
          <Headphones size={11} />
          {(station.listeners / 1000).toFixed(1)}k
        </span>
      </div>
      <p className="station-track">
        <span className="tiny-bars">
          <i />
          <i />
          <i />
        </span>
        {station.artist} <span>— {station.track}</span>
      </p>
    </article>
  );
}
export function SectionHeading({ eyebrow, title, subtitle, action = 'View all', onAction }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {onAction && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'Nothing here just yet',
  description = 'Find a station you love and make yourself at home.',
  action,
  onAction,
}) {
  return (
    <div className="empty-state">
      <Music2 size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <Button onClick={onAction}>{action}</Button>}
    </div>
  );
}
export function Modal({ title, onClose, children, wide = false }) {
  const ref = React.useRef(null);
  const opener = React.useRef(document.activeElement);
  React.useEffect(() => {
    const previous = opener.current;
    const dialog = ref.current;
    if (!dialog.contains(document.activeElement)) {
      (dialog.querySelector('button:not([disabled]),input:not([disabled])') || dialog).focus();
    }
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const elements = dialog.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]',
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? 'wide' : ''}`}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Skeleton({ width = '100%', height = 20, className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={{ width, height }} />;
}
export function LoadingState({ label = 'Finding your frequency…' }) {
  return (
    <div className="loading-state" role="status">
      <div className="loading-orbit" />
      <p>{label}</p>
    </div>
  );
}
export function ErrorState({
  title = 'We lost the signal',
  description = 'Check your connection and try again.',
  onRetry,
}) {
  return (
    <div className="empty-state error-empty" role="alert">
      <Radio size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
