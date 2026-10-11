import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  const existing = document.head.querySelector(selector);
  const meta = existing ?? document.createElement('meta');

  Object.entries(attributes).forEach(([key, value]) => {
    meta.setAttribute(key, value);
  });

  if (!existing) {
    document.head.appendChild(meta);
  }
}

const SITE_URL = 'https://tricentric.chalamandramagistral.com';

export default function SeoHead({ title, description, canonicalPath = '/' }: SeoHeadProps) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = 'es';

    const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const canonicalUrl = `${SITE_URL}${normalizedPath}`;
    const ogImageUrl = `${SITE_URL}/og-image.svg`;

    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index,follow,max-image-preview:large' });

    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImageUrl });

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImageUrl });

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [canonicalPath, description, title]);

  return null;
}
