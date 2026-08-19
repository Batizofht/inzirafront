import { ScrollViewStyleReset } from 'expo-router/html';

/**
 * Boot overlay.
 *
 * The web build is a static export, so Netlify serves fully pre-rendered HTML
 * that paints long before the bundle hydrates. Two things are wrong with that
 * paint and neither can be fixed in the markup:
 *
 *  1. It is the *mobile* layout at whatever the real width is. `useWindowDimensions`
 *     reports 0x0 during the Node render and during the first client render (see
 *     hooks/use-window-dimensions.ts), so every `width >= 768` branch is false and
 *     a desktop visitor gets the phone layout stretched across their monitor.
 *  2. It has no data. Daily picks, categories and location are all client-fetched,
 *     so the page shows empty sections and then pops content in one piece at a time.
 *
 * Both windows close at hydration, so we cover exactly that window with the same
 * splash the native app shows and lift it when the app signals ready.
 *
 * This deliberately does NOT gate `{children}` - the pre-rendered content stays in
 * the DOM, unhidden, so crawlers still index a full page. The overlay is a sibling
 * painted on top, removed by app/_layout.tsx once hydration commits.
 */
const BOOT_STYLES = `
#inzira-boot{position:fixed;inset:0;z-index:99999;background:#FFFFFF;display:flex;
flex-direction:column;align-items:center;justify-content:center;
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
opacity:1;transition:opacity .25s ease-out}
#inzira-boot.is-ready{opacity:0;pointer-events:none}
#inzira-boot img{width:60px;height:60px;border-radius:10px;margin-bottom:24px}
#inzira-boot .inzira-boot-title{font-size:28px;font-weight:800;color:#1E293B;letter-spacing:-.5px}
#inzira-boot .inzira-boot-sub{font-size:14px;font-weight:500;color:#64748B;margin-top:6px;letter-spacing:.5px}
#inzira-boot .inzira-boot-spinner{margin-top:28px;width:22px;height:22px;border-radius:50%;
border:2px solid rgba(37,99,235,.2);border-top-color:#2563EB;animation:inzira-boot-spin .7s linear infinite}
@keyframes inzira-boot-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#inzira-boot .inzira-boot-spinner{animation:none}}
`;

/**
 * Failsafe. If the bundle 404s, throws before mounting, or is blocked, nothing
 * would ever remove the overlay and the site would be a permanent white screen.
 * A hard timeout guarantees the pre-rendered content underneath becomes visible.
 */
const BOOT_FAILSAFE = `
(function(){var el=document.getElementById('inzira-boot');if(!el)return;
setTimeout(function(){if(el&&el.parentNode){el.classList.add('is-ready');
setTimeout(function(){el.parentNode&&el.parentNode.removeChild(el)},300)}},8000)})();
`;

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Theme & PWA */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="msapplication-TileColor" content="#2563EB" />
        <link rel="icon" type="image/png" href="/Logo.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Open Graph default image */}
        <meta property="og:image" content="https://inzira.co/og-image.png" />

        <style dangerouslySetInnerHTML={{ __html: BOOT_STYLES }} />
        {/* A crawler that does not run JS never removes the overlay, so make sure
            it never sees one covering the content it came to read. */}
        <noscript dangerouslySetInnerHTML={{ __html: '<style>#inzira-boot{display:none!important}</style>' }} />

        <ScrollViewStyleReset />
      </head>
      <body>
        <div id="inzira-boot">
          <img src="/Logo.png" alt="" aria-hidden="true" />
          <div className="inzira-boot-title">Welcome To Inzira</div>
          <div className="inzira-boot-sub">The Verified Car Marketplace</div>
          <div className="inzira-boot-spinner" />
        </div>
        <script dangerouslySetInnerHTML={{ __html: BOOT_FAILSAFE }} />
        {children}
      </body>
    </html>
  );
}
