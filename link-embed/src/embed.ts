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
  private loader: HTMLElement | null;
  private styleSheet: HTMLStyleElement | null;
  private config: LinkConfig;

  private constructor(config: LinkConfig) {
    this.loaded = false;
    this.eventTarget = new EventTarget();
    this.iframe = null;
    this.overlay = null;
    this.loader = null;
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
  public static create(config: LinkConfig): LinkHandler {
    const embedLink = new OFAuthLinkEmbed(config);
    return embedLink.initialize();
  }

  private initialize(): LinkHandler {
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
        width: 40px;
        height: 40px;
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
    try {
      var parsedURL = new URL(this.config.url);
    } catch (error) {
      console.error("Invalid URL: ", this.config.url, error);
      return {
        open: () => {
          console.error("Invalid URL, please reinitialize with a valid URL: ", this.config.url);
        },
        close: () => {
          console.error("Invalid URL, please reinitialize with a valid URL: ", this.config.url);
        },
        destroy: () => {
          console.error("Invalid URL, please reinitialize with a valid URL: ", this.config.url);
        },
        ready: false
      };
    }
    parsedURL.searchParams.set("embed", "true");
    parsedURL.searchParams.set("embed_origin", window.location.origin);
    if (this.config.theme) {
      parsedURL.searchParams.set("theme", this.config.theme);
    }
    this.config.url = parsedURL.toString();

    if (!this.iframe) {
      // look for existing iframe
      this.iframe = document.querySelector(Selectors.iframe);
    }

    if (!this.iframe) {
      this.iframe = document.createElement("iframe");
      this.iframe.src = this.config.url;
      this.iframe.id = Selectors.iframe.replace("#", "");
      this.iframe.style.display = "none";
      this.iframe.setAttribute("data-theme", this.config.theme || "auto");
    }

    if (!this.overlay) {
      // look for existing overlay
      this.overlay = document.querySelector(Selectors.overlay);
    }

    if (!this.overlay) {
      // Create overlay but don't display it yet
      this.overlay = document.createElement("div");
      this.overlay.id = Selectors.overlay.replace("#", "");
      this.overlay.style.display = "none";
    }

    // document.body.appendChild(this.iframe);
    // document.body.appendChild(this.overlay);

    return {
      open: this.open.bind(this),
      close: this.close.bind(this),
      destroy: this.destroy.bind(this),
      ready: this.loaded
    };
  }

  private createLoader(): void {
    if (this.loader) {
      return;
    }
    this.loader = document.createElement("div");
    this.loader.id = Selectors.loader.replace("#", "");

    // add spinner
    const spinner = document.createElement("div");
    spinner.className = "ofauth-loader-spinner";
    this.loader.appendChild(spinner);

    document.body.appendChild(this.loader);
  }

  private open(): void {
    if (this.iframe && this.overlay) {
      // Reset loaded state when opening
      this.loaded = false;

      // Reload the iframe content
      this.iframe.style.display = "none";
      this.overlay.style.display = "none";


      // show loader
      document.body.classList.add("ofauth-no-scroll");
      this.createLoader();

      this.iframe.src = this.config.url;

      document.body.appendChild(this.iframe);
      document.body.appendChild(this.overlay);

      // wait for the iframe to load
      this.iframe.addEventListener("load", () => {
        if (this.iframe) {
          this.iframe.style.display = "block";
        }
        if (this.overlay) {
          this.overlay.style.display = "block";
        }
        // remove loader
        if (this.loader) {
          try {
            document.body.removeChild(this.loader);
          } catch {
          }
          this.loader = null;
        }
      }, { once: true });
    }
  }

  private destroy(): void {
    // Remove both iframe and overlay
    if (this.iframe) {
      try {
        document.body.removeChild(this.iframe);
      } catch {
      }
      this.iframe = null;
    }
    if (this.overlay) {
      try {
        document.body.removeChild(this.overlay);
      } catch {
      }
      this.overlay = null;
    }
    if (this.styleSheet) {
      try {
        document.head.removeChild(this.styleSheet);
      } catch {
      }
      this.styleSheet = null;
    }

    if (this.loader) {
      try {
        document.body.removeChild(this.loader);
      } catch {
      }
      this.loader = null;
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
    if (this.iframe && this.overlay) {
      this.iframe.style.display = "none";
      this.overlay.style.display = "none";
      document.body.classList.remove("ofauth-no-scroll");
      try {
        document.body.removeChild(this.overlay);
      } catch {
      }
      this.overlay = null;
      try {
        document.body.removeChild(this.iframe);
      } catch {
      }
      this.iframe = null;
      // Reset loaded state when closing
      this.loaded = false;
    }
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
      try {
        document.body.removeChild(loader);
      } catch {
      }
      this.loader = null;
    }
    this.loaded = true;
    if (this.config.onLoad) {
      this.config.onLoad();
    }
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
        new CustomEvent(data.event, { detail: data, cancelable: true })
      );
    });
  }
}

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

export { OFAuthLinkEmbed };
