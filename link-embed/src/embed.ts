import { OFAUTH_EVENT, Selectors } from "./constants";
import type { EmbedLinkMessageLoaded, EmbedLinkMessageClose, EmbedLinkMessageSuccess } from "./types";

const isEmbedLinkMessage = (
  message: any,
) => {
  return message.type === OFAUTH_EVENT;
};

export interface LinkConfig {
  url: string;
  theme?: "light" | "dark";
  onSuccess?: (data: EmbedLinkMessageSuccess) => void;
  onLoad?: () => void;
  onClose?: () => void;
}

export interface LinkHandler {
  open: () => void;
  close: () => void;
  destroy: () => void;
  ready: boolean;
}

/**
 * Represents an embedded Link instance.
 */
class OFAuthLinkEmbed {
  private loaded: boolean;
  private eventTarget: EventTarget;
  private iframe: HTMLIFrameElement | null;
  private overlay: HTMLElement | null;
  private styleSheet: HTMLStyleElement | null;
  private config: LinkConfig;

  private constructor(config: LinkConfig) {
    this.loaded = false;
    this.eventTarget = new EventTarget();
    this.iframe = null;
    this.overlay = null;
    this.styleSheet = null;
    this.config = config;

    this.initWindowListener();
    this.addEventListener("loaded", this.loadedListener.bind(this));
    this.addEventListener("close", this.closeListener.bind(this));
    this.addEventListener("success", this.successListener.bind(this));
  }

  /**
   * Create a new embedded Link instance.
   * This will pre-initialize the iframe but not display it until open() is called.
   */
  public static create(config: LinkConfig): Promise<LinkHandler> {
    console.log("create", config)
    const embedLink = new OFAuthLinkEmbed(config);
    return embedLink.initialize();
  }

  private async initialize(): Promise<LinkHandler> {
    // Create and inject stylesheet
    this.styleSheet = document.createElement("style");
    this.styleSheet.innerText = `
      ${Selectors.loader} .ofauth-loader-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #fff;
        border-bottom-color: transparent;
        border-radius: 50%;
        display: inline-block;
        box-sizing: border-box;
        animation: ofauth-loader-spinner-animation 1s linear infinite;
      }
      @keyframes ofauth-loader-spinner-animation {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
      body.ofauth-no-scroll {
        overflow: hidden;
      }
      
      ${Selectors.iframe} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        height: 600px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
      }
      ${Selectors.iframe}[data-theme="dark"] {
        border-color: #404040;
      }
      
      @media (prefers-color-scheme: dark) {
        ${Selectors.iframe}:not([data-theme="light"]) {
          border-color: #404040;
        }
      }

      @media (prefers-color-scheme: light) {
        ${Selectors.iframe}:not([data-theme="dark"]) {
          border-color: #e0e0e0;
        }
      }

      ${Selectors.loader} {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
      }
      
      ${Selectors.overlay} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.25);
        z-index: 2147483646;
      }
    `;
    document.head.appendChild(this.styleSheet);

    // Create and prepare iframe but don't display it yet
    const parsedURL = new URL(this.config.url);
    parsedURL.searchParams.set("embed", "true");
    parsedURL.searchParams.set("embed_origin", window.location.origin);
    if (this.config.theme) {
      parsedURL.searchParams.set("theme", this.config.theme);
    }

    this.iframe = document.createElement("iframe");
    this.iframe.src = parsedURL.toString();
    this.iframe.id = Selectors.iframe.replace("#", "");
    this.iframe.style.display = "none";
    this.iframe.setAttribute("data-theme", this.config.theme || "auto");

    // Create overlay but don't display it yet
    this.overlay = document.createElement("div");
    this.overlay.id = Selectors.overlay.replace("#", "");
    this.overlay.style.display = "none";

    document.body.appendChild(this.iframe);
    document.body.appendChild(this.overlay);

    this.iframe.addEventListener("load", () => {
      this.eventTarget.dispatchEvent(new CustomEvent("loaded", { detail: {} }));
      if (this.config.onLoad) {
        this.config.onLoad();
      }
      this.loaded = true;
    });
    
    console.log("iframe", this.iframe)
    console.log("overlay", this.overlay)
    
    return new Promise((resolve) => {
      this.addEventListener("loaded", () => {
        console.log("loaded")
        if (this.config.onLoad) {
          this.config.onLoad();
        }
        
        resolve({
          open: this.open.bind(this),
          close: this.close.bind(this),
          destroy: this.destroy.bind(this),
          ready: true
        });
      }, { once: true });
    });
  }

  private open(): void {
    if (this.iframe && this.overlay) {
      document.body.classList.add("ofauth-no-scroll");
      this.iframe.style.display = "block";
      this.overlay.style.display = "block";
    }
  }

  private destroy(): void {
    this.close();
    if (this.styleSheet) {
      document.head.removeChild(this.styleSheet);
    }
    // Clean up event listeners
    this.eventTarget = new EventTarget();
  }

  // Update success listener to use config callback
  private successListener(event: CustomEvent<EmbedLinkMessageSuccess>): void {
    if (event.defaultPrevented) {
      return;
    }

    if (this.config.onSuccess) {
      this.config.onSuccess(event.detail);
    }

    if (event.detail.redirect) {
      window.location.href = event.detail.successURL;
    }
  }

  // Update close listener to use config callback
  private closeListener(event: CustomEvent<EmbedLinkMessageClose>): void {
    if (event.defaultPrevented) {
      return;
    }

    this.close();

    if (this.config.onClose) {
      this.config.onClose();
    }
  }

  /**
   * Initialize embedded Link triggers.
   *
   * This method will add a click event listener to all elements with the `data-ofauth-link` attribute.
   * The Link client session URL is either the `href` attribute for a link element or the value of `data-ofauth-link` attribute.
   *
   * The theme can be optionally set using the `data-ofauth-theme` attribute.
   *
   * @example
   * ```html
   * <a href="https://auth.ofauth.com/s/xxxxxxxx" data-ofauth-link data-ofauth-theme="dark">Link</a>
   * ```
   */
  public static init(): void {
    const LinkElements = document.querySelectorAll("[data-ofauth-link]");
    LinkElements.forEach((LinkElement) => {
      LinkElement.removeEventListener(
        "click",
        OFAuthLinkEmbed.elementClickHandler,
      );
      LinkElement.addEventListener(
        "click",
        OFAuthLinkEmbed.elementClickHandler,
      );
    });
  }

  /**
   * Close the embedded Link.
   */
  public close(): void {
    // Remove both iframe and overlay
    // check if iframe exists
    const iframe = document.getElementById(Selectors.iframe.replace("#", ""));
    if (iframe) {
      document.body.removeChild(iframe);
    }
    const overlay = document.getElementById(Selectors.overlay.replace("#", ""));
    if (overlay) {
      document.body.removeChild(overlay);
    }
    document.body.classList.remove("ofauth-no-scroll");
    this.loaded = false;
  }

  /**
   * Add an event listener to the embedded Link events.
   *
   * @param type
   * @param listener
   */
  public addEventListener(
    type: "loaded",
    listener: (event: CustomEvent<EmbedLinkMessageLoaded>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  public addEventListener(
    type: "close",
    listener: (event: CustomEvent<EmbedLinkMessageClose>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  public addEventListener(
    type: "success",
    listener: (event: CustomEvent<EmbedLinkMessageSuccess>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  public addEventListener(
    type: string,
    listener: any,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.eventTarget.addEventListener(type, listener, options);
  }

  /**
   * Remove an event listener from the embedded Link events.
   *
   * @param type
   * @param listener
   */
  public removeEventListener(
    type: "loaded",
    listener: (event: CustomEvent<EmbedLinkMessageLoaded>) => void,
  ): void;
  public removeEventListener(
    type: "close",
    listener: (event: CustomEvent<EmbedLinkMessageClose>) => void,
  ): void;
  public removeEventListener(
    type: "success",
    listener: (event: CustomEvent<EmbedLinkMessageSuccess>) => void,
  ): void;
  public removeEventListener(type: string, listener: any): void {
    this.eventTarget.removeEventListener(type, listener);
  }

  private static async elementClickHandler(e: Event) {
    e.preventDefault();
    const LinkElement = e.target as HTMLElement;
    const url = LinkElement.getAttribute("href") ||
      (LinkElement.getAttribute("data-ofauth-link") as string);
    const theme = LinkElement.getAttribute("data-ofauth-theme") as
      | "light"
      | "dark"
      | undefined;
    OFAuthLinkEmbed.create({ url, theme });
  }

  /**
   * Default listener for the `load` event.
   *
   * This listener will remove the loader spinner when the embedded Link is fully loaded.
   */
  private loadedListener(event: CustomEvent<EmbedLinkMessageLoaded>): void {
    if (event.defaultPrevented || this.loaded) {
      return;
    }
    const loader = document.getElementById("ofauth-loader");
    if (loader) {
      document.body.removeChild(loader);
    }
    this.loaded = true;
  }

  /**
   * Initialize the window message listener to receive messages from the embedded Link
   * and re-dispatch them as events for the embedded Link instance.
   */
  private initWindowListener(): void {
    window.addEventListener("message", ({ data, origin }) => {
      if (
        !["https://auth.ofauth.com"].includes(origin)
      ) {
        return;
      }
      if (!isEmbedLinkMessage(data)) {
        return;
      }
      this.eventTarget.dispatchEvent(
        new CustomEvent(data.event, { detail: data, cancelable: true }),
      );
    });
  }
}

class LinkComponent extends HTMLElement {
  private embedLinkHandler: LinkHandler | null = null;
  private button: HTMLButtonElement;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Create a style element for default styles
    const style = document.createElement('style');
    style.textContent = `
      .ofauth-link-button {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: #fff;
        transition: background-color 0.3s;
      }
      .ofauth-link-button:hover {
        background-color: #0056b3;
      }
    `;

    // Create a button element
    this.button = document.createElement('button');
    this.button.className = 'ofauth-link-button';
    this.button.setAttribute('part', 'button');

    // Append style and button to shadow DOM
    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(this.button);

    // Add click event to button
    this.button.addEventListener('click', () => this.handleButtonClick());
  }

  connectedCallback() {
    // Use either the label attribute or slot content
    const label = this.getAttribute('label');
    this.button.textContent = label || this.textContent || 'Link';
  }

  disconnectedCallback() {
    if (this.embedLinkHandler) {
      this.embedLinkHandler.destroy();
      this.embedLinkHandler = null;
    }
  }

  private async handleButtonClick() {
    const url = this.getAttribute('url');
    const theme = this.getAttribute('theme') as "light" | "dark" | undefined;

    if (url) {
      if (!this.embedLinkHandler) {
        this.embedLinkHandler = await OFAuthLinkEmbed.create({
          url,
          theme,
          onSuccess: (data) => {
            this.dispatchEvent(new CustomEvent('success', { detail: data }));
          },
          onClose: () => {
            this.dispatchEvent(new CustomEvent('exit'));
          }
        });
      }

      this.embedLinkHandler.open();
    }
  }
}

customElements.define('ofauth-link', LinkComponent);


declare global {
  interface Window {
    OFAuth: {
      LinkEmbed: typeof OFAuthLinkEmbed;
    };
  }
}

if (typeof window !== "undefined") {
  window.OFAuth = { LinkEmbed: OFAuthLinkEmbed };
}

if (typeof document !== "undefined") {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript && currentScript.hasAttribute("data-auto-init")) {
    document.addEventListener("DOMContentLoaded", async () => {
      window.OFAuth.LinkEmbed.init();
    });
  }
}

export { LinkComponent, OFAuthLinkEmbed };
