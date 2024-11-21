import { OFAUTH_LOGIN_EVENT } from "./constants";
import type { EmbedLoginMessageLoaded, EmbedLoginMessageClose, EmbedLoginMessageSuccess } from "./types";

const isEmbedLoginMessage = (
  message: any,
) => {
  return message.type === OFAUTH_LOGIN_EVENT;
};

/**
 * Represents an embedded login instance.
 */
class EmbedLogin {
  private iframe: HTMLIFrameElement;
  private loader: HTMLDivElement;
  private loaded: boolean;
  private eventTarget: EventTarget;

  public constructor(iframe: HTMLIFrameElement, loader: HTMLDivElement) {
    this.iframe = iframe;
    this.loader = loader;
    this.loaded = false;
    this.eventTarget = new EventTarget();
    this.initWindowListener();
    this.addEventListener("loaded", this.loadedListener.bind(this));
    this.addEventListener("close", this.closeListener.bind(this));
    this.addEventListener("success", this.successListener.bind(this));
  }

  /**
   * Create a new embedded login instance by injecting an iframe into the DOM.
   *
   * @param url A Login Link.
   * @param theme The theme of the embedded login. Defaults to `light`.

   * @returns A promise that resolves to an instance of EmbedLogin.
   * The promise resolves when the embedded login is fully loaded.
   */
  public static async create(
    url: string,
    theme?: "light" | "dark",
  ): Promise<EmbedLogin> {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
      .ofauth-loader-spinner {
        width: 20px;
        aspect-ratio: 1;
        border-radius: 50%;
        background: ${theme === "dark" ? "#000" : "#fff"};
        box-shadow: 0 0 0 0 ${theme === "dark" ? "#fff" : "#000"};
        animation: ofauth-loader-spinner-animation 1s infinite;
      }
      @keyframes ofauth-loader-spinner-animation {
        100% {box-shadow: 0 0 0 30px #0000}
      }
      body.ofauth-no-scroll {
        overflow: hidden;
      }
    `;
    document.head.appendChild(styleSheet);

    // Create loader
    const loader = document.createElement("div");
    loader.style.position = "absolute";
    loader.style.top = "50%";
    loader.style.left = "50%";
    loader.style.transform = "translate(-50%, -50%)";
    loader.style.zIndex = "2147483647";
    loader.style.colorScheme = "auto";

    // Create spinning icon
    const spinner = document.createElement("div");
    spinner.className = "ofauth-loader-spinner";
    loader.appendChild(spinner);

    // Insert into the DOM
    document.body.classList.add("ofauth-no-scroll");
    document.body.appendChild(loader);

    // Add query parameters to the Login Link
    const parsedURL = new URL(url);
    parsedURL.searchParams.set("embed", "true");
    parsedURL.searchParams.set("embed_origin", window.location.origin);
    if (theme) {
      parsedURL.searchParams.set("theme", theme);
    }
    const embedURL = parsedURL.toString();
    
    // Create iframe
    const iframe = document.createElement("iframe");
    iframe.src = embedURL;
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.zIndex = "2147483647";
    iframe.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
    iframe.style.colorScheme = "auto";
    document.body.appendChild(iframe);
    
    const embedLogin = new EmbedLogin(iframe, loader);
    return new Promise((resolve) => {
      embedLogin.addEventListener("loaded", () => resolve(embedLogin), {
        once: true,
      });
    });
  }

  /**
   * Initialize embedded login triggers.
   *
   * This method will add a click event listener to all elements with the `data-ofauth-login` attribute.
   * The Login Link is either the `href` attribute for a link element or the value of `data-ofauth-login` attribute.
   *
   * The theme can be optionally set using the `data-ofauth-login-theme` attribute.
   *
   * @example
   * ```html
   * <a href="https://auth.ofauth.com/s/xxxxxxxx" data-ofauth-login data-ofauth-login-theme="dark">Login</a>
   * ```
   */
  public static init(): void {
    const loginElements = document.querySelectorAll("[data-ofauth-login]");
    loginElements.forEach((loginElement) => {
      loginElement.removeEventListener(
        "click",
        EmbedLogin.loginElementClickHandler,
      );
      loginElement.addEventListener(
        "click",
        EmbedLogin.loginElementClickHandler,
      );
    });
  }

  /**
   * Close the embedded login.
   */
  public close(): void {
    document.body.removeChild(this.iframe);
    document.body.classList.remove("ofauth-no-scroll");
  }

  /**
   * Add an event listener to the embedded login events.
   *
   * @param type
   * @param listener
   */
  public addEventListener(
    type: "loaded",
    listener: (event: CustomEvent<EmbedLoginMessageLoaded>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  public addEventListener(
    type: "close",
    listener: (event: CustomEvent<EmbedLoginMessageClose>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void;
  public addEventListener(
    type: "success",
    listener: (event: CustomEvent<EmbedLoginMessageSuccess>) => void,
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
   * Remove an event listener from the embedded login events.
   *
   * @param type
   * @param listener
   */
  public removeEventListener(
    type: "loaded",
    listener: (event: CustomEvent<EmbedLoginMessageLoaded>) => void,
  ): void;
  public removeEventListener(
    type: "close",
    listener: (event: CustomEvent<EmbedLoginMessageClose>) => void,
  ): void;
  public removeEventListener(
    type: "success",
    listener: (event: CustomEvent<EmbedLoginMessageSuccess>) => void,
  ): void;
  public removeEventListener(type: string, listener: any): void {
    this.eventTarget.removeEventListener(type, listener);
  }

  private static async loginElementClickHandler(e: Event) {
    e.preventDefault();
    const loginElement = e.target as HTMLElement;
    const url = loginElement.getAttribute("href") ||
      (loginElement.getAttribute("data-ofauth-login") as string);
    const theme = loginElement.getAttribute("data-ofauth-login-theme") as
      | "light"
      | "dark"
      | undefined;
    EmbedLogin.create(url, theme);
  }

  /**
   * Default listener for the `loaded` event.
   *
   * This listener will remove the loader spinner when the embedded login is fully loaded.
   */
  private loadedListener(event: CustomEvent<EmbedLoginMessageLoaded>): void {
    if (event.defaultPrevented || this.loaded) {
      return;
    }
    document.body.removeChild(this.loader);
    this.loaded = true;
  }

  /**
   * Default listener for the `close` event.
   *
   * This listener will call the `close` method to remove the embedded login from the DOM.
   */
  private closeListener(event: CustomEvent<EmbedLoginMessageClose>): void {
    if (event.defaultPrevented) {
      return;
    }
    this.close();
  }

  /**
   * Default listener for the `success` event.
   *
   * This listener will redirect the parent window to the `successURL` if `redirect` is set to `true`.
   */
  private successListener(
    event: CustomEvent<EmbedLoginMessageSuccess>,
  ): void {
    if (event.defaultPrevented) {
      return;
    }
    if (event.detail.redirect) {
      window.location.href = event.detail.successURL;
    }
  }

  /**
   * Initialize the window message listener to receive messages from the embedded login
   * and re-dispatch them as events for the embedded login instance.
   */
  private initWindowListener(): void {
    window.addEventListener("message", ({ data, origin }) => {
      if (
        !["https://auth.ofauth.com"].includes(origin)
      ) {
        return;
      }
      if (!isEmbedLoginMessage(data)) {
        return;
      }
      this.eventTarget.dispatchEvent(
        new CustomEvent(data.event, { detail: data, cancelable: true }),
      );
    });
  }
}

declare global {
  interface Window {
    OFAuth: {
      EmbedLogin: typeof EmbedLogin;
    };
  }
}

if (typeof window !== "undefined") {
  window.OFAuth = {
    EmbedLogin,
  };
}

if (typeof document !== "undefined") {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  if (currentScript && currentScript.hasAttribute("data-auto-init")) {
    document.addEventListener("DOMContentLoaded", async () => {
      EmbedLogin.init();
    });
  }
}

export { EmbedLogin as OFAuthEmbedLogin };
