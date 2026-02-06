/**
 * Utility to inject tracking logic into email HTML
 */
export function injectTracking(html: string, emailId: string, baseUrl: string): string {
    let modifiedHtml = html;

    // 1. Inject Tracking Pixel
    const trackingUrl = `${baseUrl}/api/email/track/${emailId}`;
    const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none !important;" alt="" />`;

    if (modifiedHtml.includes('</body>')) {
        modifiedHtml = modifiedHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
        modifiedHtml = `${modifiedHtml}${trackingPixel}`;
    }

    // 2. Wrap Links for Click Tracking
    // We target all <a href="..."> tags and replace the URL with our redirector
    const clickTrackingUrlBase = `${baseUrl}/api/email/track/click/${emailId}?url=`;

    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;

    modifiedHtml = modifiedHtml.replace(linkRegex, (match, quote, originalUrl) => {
        // Skip mailto, tel, and anchor links
        if (originalUrl.startsWith('mailto:') || originalUrl.startsWith('tel:') || originalUrl.startsWith('#')) {
            return match;
        }

        // Skip already tracked links (safety)
        if (originalUrl.includes('/api/email/track/click/')) {
            return match;
        }

        const wrappedUrl = `${clickTrackingUrlBase}${encodeURIComponent(originalUrl)}`;
        return match.replace(originalUrl, wrappedUrl);
    });

    return modifiedHtml;
}
