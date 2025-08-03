export const OFAUTH_EVENT = "OFAUTH_LINK";

export const Selectors = {
    loader: "#ofauth-loader",
    iframe: "#ofauth-iframe",
    overlay: "#ofauth-modal-overlay",
}

export const OFAUTH_ORIGINS = [
    "https://link-next.ofauth.com",
    "https://link.ofauth.com"
];

/**
 * Check if an origin should be allowed for embed messages
 * Only validates that messages are coming FROM trusted OFAuth iframe origins,
 * not where the embed is hosted (third-party sites can embed anywhere)
 */
export function isAllowedOrigin(origin: string): boolean {
    // Allow production OFAuth origins (messages FROM the iframe)
    if (OFAUTH_ORIGINS.includes(origin)) {
        return true;
    }

    // Allow any localhost origin for development (regardless of port)
    try {
        const url = new URL(origin);
        const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        if (isLocalhost) {
            return true;
        }
        
        // Allow any *.ofauth.com subdomain for iframe origins
        if (url.hostname.endsWith('.ofauth.com')) {
            return true;
        }
    } catch {
        console.log(`[OFAuth] Invalid origin format: ${origin}`);
        return false;
    }
    
    console.log(`[OFAuth] Rejected origin: ${origin} - not from trusted OFAuth domain`);
    return false;
}