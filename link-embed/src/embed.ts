import { OFAUTH_EVENT, Selectors, isAllowedOrigin } from "./constants";
import type {
  CloseMetadata,
  Connection,
  SuccessMetadata,
  SandboxInfoMetadata,
  EmbedLinkMessage,
  EmbedLinkMessageExit,
  EmbedLinkMessageInvalidSession,
  EmbedLinkMessageSuccess,
  EmbedLinkMessageSandboxInfo,
} from "./types";

export type { Connection, CloseMetadata, SuccessMetadata, SandboxInfoMetadata, EmbedLinkMessage };

type Theme = "light" | "dark" | "auto";

interface LinkEventDetailMap {
  loaded: undefined;
  success: SuccessMetadata;
  close: CloseMetadata;
  invalid_session: undefined;
  sandbox_info: SandboxInfoMetadata;
}

const DEFAULT_THEME: Theme = "auto";

const isEmbedLinkMessage = (payload: any): payload is EmbedLinkMessage & { type?: string } => {
  return Boolean(payload && typeof payload === "object" && payload.type === OFAUTH_EVENT);
};

export interface LinkConfig {
  url?: string;
  theme?: Theme;
  onSuccess?: (metadata: SuccessMetadata) => void | Promise<void>;
  onLoad?: () => void | Promise<void>;
  onClose?: (metadata: CloseMetadata) => void | Promise<void>;
  onInvalidSession?: () => void | Promise<void>;
  onSandboxInfo?: (metadata: SandboxInfoMetadata) => void | Promise<void>;
}

export interface LinkHandler {
  open: (url?: string) => void;
  close: (options?: { force?: boolean }) => void;
  destroy: () => void;
  cleanup: () => void;
  setUrl: (url: string) => void;
  readonly ready: boolean;
}

/**
 * Represents an embedded Link instance.
 */
class OFAuthLinkEmbed {
  private static triggerHandlers = new WeakMap<Element, LinkHandler>();

  private config: LinkConfig;
  private loaded = false;
  private eventTarget = new EventTarget();
  private iframe: HTMLIFrameElement | null = null;
  private overlay: HTMLElement | null = null;
  private loader: HTMLElement | null = null;
  private sandboxBanner: HTMLElement | null = null;
  private sandboxInfo: SandboxInfoMetadata | null = null;
  private styleSheet: HTMLStyleElement | null = null;
  private currentUrl: string | null;
  private iframeOrigin: string | null;
  private messageListener: (event: MessageEvent) => void;
  private destroyed = false;

  private constructor(config: LinkConfig) {
    this.config = { ...config };
    this.currentUrl = config.url ? this.prepareUrl(config.url) : null;
    this.iframeOrigin = this.currentUrl ? new URL(this.currentUrl).origin : null;
    this.messageListener = this.handleWindowMessage.bind(this);

    this.addInternalListeners();
    this.initWindowListener();
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
    this.ensureStyleSheet();
    if (this.currentUrl) {
      this.ensureOverlay();
      this.ensureIframe();
    }

    const handler = {
      open: this.open.bind(this),
      close: this.close.bind(this),
      destroy: this.destroy.bind(this),
      cleanup: this.cleanup.bind(this),
      setUrl: this.setUrl.bind(this),
      ready: this.loaded,
    } as LinkHandler;

    Object.defineProperty(handler, "ready", {
      get: () => this.loaded,
      enumerable: true,
    });

    return handler;
  }

  private addInternalListeners(): void {
    this.addEventListener("loaded", this.loadedListener.bind(this));
    this.addEventListener("success", this.successListener.bind(this));
    this.addEventListener("close", this.closeListener.bind(this));
    this.addEventListener("invalid_session", this.invalidSessionListener.bind(this));
    this.addEventListener("sandbox_info", this.sandboxInfoListener.bind(this));
  }

  private ensureStyleSheet(): void {
    if (this.styleSheet || typeof document === "undefined") {
      return;
    }

    this.styleSheet = document.createElement("style");
    this.styleSheet.innerHTML = `
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
        border: 1px solid var(--border, #e0e0e0);
        border-radius: var(--radius, 8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 2147483647;
        background-color: transparent;
      }
      ${Selectors.iframe}[data-theme="dark"] {
        border-color: var(--border, #404040);
      }
      
      @media (prefers-color-scheme: dark) {
        ${Selectors.iframe}:not([data-theme="light"]) {
          border-color: var(--border, #404040);
        }
      }

      @media (prefers-color-scheme: light) {
        ${Selectors.iframe}:not([data-theme="dark"]) {
          border-color: var(--border, #e0e0e0);
        }
      }

      ${Selectors.loader} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2147483647;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      ${Selectors.overlay} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 2147483646;
        display: none;
      }

      ${Selectors.sandboxBanner} {
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #e0e7ff;
        max-width: 360px;
        width: calc(100% - 32px);
        display: none;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-icon {
        width: 20px;
        height: 20px;
        background: rgba(99, 102, 241, 0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-title {
        font-weight: 600;
        font-size: 13px;
        color: #c7d2fe;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-desc {
        font-size: 11px;
        color: #a5b4fc;
        margin-bottom: 10px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-creds {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-cred {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 12px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-cred-label {
        font-weight: 500;
        color: #a5b4fc;
        min-width: 40px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-cred-value {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
        color: #e0e7ff;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-copy {
        background: transparent;
        border: none;
        color: #a5b4fc;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s, color 0.15s;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-copy:hover {
        background: rgba(99, 102, 241, 0.2);
        color: #c7d2fe;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-minimize {
        position: absolute;
        top: 8px;
        right: 8px;
        background: transparent;
        border: none;
        color: #a5b4fc;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }

      ${Selectors.sandboxBanner} .ofauth-sandbox-minimize:hover {
        background: rgba(99, 102, 241, 0.2);
      }

      ${Selectors.sandboxBanner}.minimized {
        padding: 8px 12px;
        cursor: pointer;
      }

      ${Selectors.sandboxBanner}.minimized .ofauth-sandbox-content {
        display: none;
      }

      ${Selectors.sandboxBanner}.minimized .ofauth-sandbox-header {
        margin-bottom: 0;
      }

      ${Selectors.sandboxBanner}.minimized .ofauth-sandbox-minimize {
        display: none;
      }
    `;

    document.head.appendChild(this.styleSheet);
  }

  private ensureOverlay(): void {
    if (this.overlay || typeof document === "undefined") {
      return;
    }

    this.overlay = document.createElement("div");
    this.overlay.id = Selectors.overlay.replace("#", "");
    this.overlay.style.display = "none";
    this.overlay.addEventListener("click", () => {
      this.close();
    });
  }

  private updateSandboxBanner(info: SandboxInfoMetadata): void {
    this.sandboxInfo = info;

    if (typeof document === "undefined") {
      return;
    }

    const scenario = info.scenarios.find(s => s.id === info.activeScenarioId);
    if (!scenario) {
      this.hideSandboxBanner();
      return;
    }

    if (!this.sandboxBanner) {
      this.sandboxBanner = document.createElement("div");
      this.sandboxBanner.id = Selectors.sandboxBanner.replace("#", "");
      this.sandboxBanner.addEventListener("click", (e) => {
        if (this.sandboxBanner?.classList.contains("minimized")) {
          this.sandboxBanner.classList.remove("minimized");
        }
        e.stopPropagation();
      });
    }

    // Determine credentials to show based on current screen
    const isOtpScreen = info.currentScreen === "otp";
    const emailDomain = `@${scenario.id}.sandbox.com`;

    let credentialsHtml = "";

    if (isOtpScreen && scenario.otpCode) {
      credentialsHtml = `
        <div class="ofauth-sandbox-cred">
          <span class="ofauth-sandbox-cred-label">OTP</span>
          <span class="ofauth-sandbox-cred-value">${scenario.otpCode}</span>
          <button class="ofauth-sandbox-copy" data-copy="${scenario.otpCode}" title="Copy OTP">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </button>
        </div>
      `;
    } else {
      credentialsHtml = `
        <div class="ofauth-sandbox-cred">
          <span class="ofauth-sandbox-cred-label">Email</span>
          <span class="ofauth-sandbox-cred-value">[any]${emailDomain}</span>
        </div>
        <div class="ofauth-sandbox-cred">
          <span class="ofauth-sandbox-cred-label">Pass</span>
          <span class="ofauth-sandbox-cred-value">${scenario.password}</span>
          <button class="ofauth-sandbox-copy" data-copy="${scenario.password}" title="Copy password">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
          </button>
        </div>
      `;
    }

    this.sandboxBanner.innerHTML = `
      <button class="ofauth-sandbox-minimize" title="Minimize">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="ofauth-sandbox-header">
        <div class="ofauth-sandbox-icon">🧪</div>
        <span class="ofauth-sandbox-title">Sandbox Mode</span>
      </div>
      <div class="ofauth-sandbox-content">
        <p class="ofauth-sandbox-desc">Use these test credentials to complete the demo.</p>
        <div class="ofauth-sandbox-creds">
          ${credentialsHtml}
        </div>
      </div>
    `;

    // Add event listeners for copy buttons
    this.sandboxBanner.querySelectorAll(".ofauth-sandbox-copy").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const value = (btn as HTMLElement).dataset.copy;
        if (value) {
          navigator.clipboard.writeText(value).then(() => {
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            `;
            setTimeout(() => {
              btn.innerHTML = originalHtml;
            }, 1500);
          });
        }
      });
    });

    // Add minimize button listener
    const minimizeBtn = this.sandboxBanner.querySelector(".ofauth-sandbox-minimize");
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.sandboxBanner?.classList.add("minimized");
      });
    }

    this.showSandboxBanner();
  }

  private showSandboxBanner(): void {
    if (!this.sandboxBanner || typeof document === "undefined") {
      return;
    }

    if (!document.body.contains(this.sandboxBanner)) {
      document.body.appendChild(this.sandboxBanner);
    }

    this.sandboxBanner.style.display = "block";
  }

  private hideSandboxBanner(): void {
    if (!this.sandboxBanner || typeof document === "undefined") {
      return;
    }

    this.sandboxBanner.style.display = "none";

    if (document.body.contains(this.sandboxBanner)) {
      document.body.removeChild(this.sandboxBanner);
    }
  }

  private ensureIframe(): void {
    if (this.iframe || typeof document === "undefined" || !this.currentUrl) {
      return;
    }

    this.iframe = document.createElement("iframe");
    this.iframe.id = Selectors.iframe.replace("#", "");
    this.iframe.style.display = "none";
    this.iframe.setAttribute("data-theme", this.config.theme ?? DEFAULT_THEME);
    this.iframe.setAttribute("allow", "camera; microphone; clipboard-read; clipboard-write");
    this.iframe.src = this.currentUrl;
  }

  private prepareUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set("embed", "true");
      parsed.searchParams.set("embed_origin", window.location.origin);
      const theme = this.config.theme ?? DEFAULT_THEME;
      parsed.searchParams.set("theme", theme);
      return parsed.toString();
    } catch (error) {
      console.error("[OFAuth] Invalid Link session URL provided:", url, error);
      throw error;
    }
  }

  public setUrl(url: string): void {
    if (this.destroyed) {
      return;
    }

    try {
      const prepared = this.prepareUrl(url);
      this.currentUrl = prepared;
      this.iframeOrigin = new URL(prepared).origin;

      if (typeof document !== "undefined" && this.iframe && !document.body.contains(this.iframe)) {
        this.iframe.src = prepared;
      }

      this.loaded = false;
    } catch {
      // prepareUrl already logged the error.
    }
  }

  private showLoader(): void {
    if (this.loader || typeof document === "undefined") {
      return;
    }

    const loader = document.createElement("div");
    loader.id = Selectors.loader.replace("#", "");

    const spinner = document.createElement("div");
    spinner.className = "ofauth-loader-spinner";
    loader.appendChild(spinner);

    document.body.appendChild(loader);
    this.loader = loader;
  }

  private hideLoader(): void {
    if (!this.loader || typeof document === "undefined") {
      return;
    }

    try {
      document.body.removeChild(this.loader);
    } catch {
      // ignore
    }

    this.loader = null;
  }

  private appendElements(): void {
    if (!this.overlay || !this.iframe || typeof document === "undefined") {
      return;
    }

    if (!document.body.contains(this.overlay)) {
      document.body.appendChild(this.overlay);
    }

    if (!document.body.contains(this.iframe)) {
      document.body.appendChild(this.iframe);
    }
  }

  private detachElements(): void {
    if (typeof document === "undefined") {
      return;
    }

    if (this.overlay && document.body.contains(this.overlay)) {
      this.overlay.style.display = "none";
      document.body.removeChild(this.overlay);
    }

    if (this.iframe && document.body.contains(this.iframe)) {
      this.iframe.style.display = "none";
      document.body.removeChild(this.iframe);
    }
  }

  private handleWindowMessage(event: MessageEvent): void {
    if (!isAllowedOrigin(event.origin)) {
      return;
    }

    if (this.iframe && event.source && event.source !== this.iframe.contentWindow) {
      return;
    }

    const payload = event.data;

    if (!isEmbedLinkMessage(payload)) {
      return;
    }

    switch (payload.event) {
      case "loaded": {
        this.eventTarget.dispatchEvent(new CustomEvent("loaded"));
        break;
      }
      case "success": {
        this.handleSuccessMessage(payload as EmbedLinkMessageSuccess);
        break;
      }
      case "exit": {
        this.handleExitMessage(payload as EmbedLinkMessageExit);
        break;
      }
      case "invalid_session": {
        this.handleInvalidSessionMessage(payload as EmbedLinkMessageInvalidSession);
        break;
      }
      case "sandbox_info": {
        this.handleSandboxInfoMessage(payload as EmbedLinkMessageSandboxInfo);
        break;
      }
      default:
        break;
    }
  }

  private handleSuccessMessage(message: EmbedLinkMessageSuccess): void {
    const metadata = message.metadata;
    this.eventTarget.dispatchEvent(
      new CustomEvent<SuccessMetadata>("success", { detail: metadata, cancelable: true }),
    );
  }

  private handleExitMessage(message: EmbedLinkMessageExit): void {
    const metadata = message.metadata;
    this.eventTarget.dispatchEvent(
      new CustomEvent<CloseMetadata>("close", { detail: metadata, cancelable: true }),
    );
  }

  private handleInvalidSessionMessage(_message: EmbedLinkMessageInvalidSession): void {
    this.eventTarget.dispatchEvent(
      new CustomEvent("invalid_session", { cancelable: false }),
    );
  }

  private handleSandboxInfoMessage(message: EmbedLinkMessageSandboxInfo): void {
    const metadata = message.metadata;
    this.eventTarget.dispatchEvent(
      new CustomEvent<SandboxInfoMetadata>("sandbox_info", { detail: metadata, cancelable: false }),
    );
  }

  private sendExitRequest(force?: boolean): void {
    if (!this.iframe || !this.iframe.contentWindow || !this.iframeOrigin) {
      return;
    }

    try {
      this.iframe.contentWindow.postMessage(
        { type: OFAUTH_EVENT, event: "exit_requested", force: Boolean(force) },
        this.iframeOrigin,
      );
    } catch (error) {
      console.error("[OFAuth] Failed to send exit request", error);
    }
  }

  public open(url?: string): void {
    if (this.destroyed) {
      console.warn("[OFAuth] Attempted to open a destroyed handler. Create a new handler instead.");
      return;
    }

    if (typeof document === "undefined") {
      console.error("[OFAuth] Unable to open Link embed outside of a browser environment.");
      return;
    }

    if (url) {
      this.setUrl(url);
    }

    if (!this.currentUrl) {
      console.error("[OFAuth] No Link session URL has been provided. Pass a URL to open() or setUrl().");
      return;
    }

    this.ensureStyleSheet();
    this.ensureOverlay();
    this.ensureIframe();

    if (!this.iframe || !this.overlay) {
      return;
    }

    this.loaded = false;
    this.overlay.style.display = "block";
    this.iframe.style.display = "none";

    this.showLoader();
    this.appendElements();
    document.body.classList.add("ofauth-no-scroll");

    const onLoad = () => {
      if (this.iframe) {
        this.iframe.style.display = "block";
      }
      this.hideLoader();
    };

    this.iframe.addEventListener("load", onLoad, { once: true });
    this.iframe.setAttribute("data-theme", this.config.theme ?? DEFAULT_THEME);
    this.iframe.src = this.currentUrl;
  }

  public close(options?: { force?: boolean }): void {
    if (this.destroyed) {
      return;
    }

    this.sendExitRequest(options?.force);

    if (options?.force) {
      this.cleanup();
    }
  }

  public cleanup(): void {
    if (this.destroyed) {
      return;
    }

    this.hideLoader();
    this.hideSandboxBanner();
    this.detachElements();

    if (typeof document !== "undefined") {
      document.body.classList.remove("ofauth-no-scroll");
    }

    this.loaded = false;
    this.sandboxInfo = null;
  }

  public destroy(): void {
    if (this.destroyed) {
      return;
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.messageListener);
    }
    this.cleanup();

    if (this.styleSheet && this.styleSheet.parentNode) {
      try {
        this.styleSheet.parentNode.removeChild(this.styleSheet);
      } catch {
        // ignore
      }
    }

    this.styleSheet = null;
    this.iframe = null;
    this.overlay = null;
    this.sandboxBanner = null;
    this.eventTarget = new EventTarget();
    this.destroyed = true;
  }

  private loadedListener(_event: CustomEvent<undefined>): void {
    if (this.loaded) {
      return;
    }

    this.loaded = true;
    this.hideLoader();

    if (this.config.onLoad) {
      Promise.resolve(this.config.onLoad()).catch((error) => {
        console.error("[OFAuth] Error in onLoad callback", error);
      });
    }
  }

  private successListener(event: CustomEvent<SuccessMetadata>): void {
    if (event.defaultPrevented) {
      return;
    }

    const metadata = event.detail;

    const finalize = () => {
      if (metadata.redirect) {
        window.location.href = metadata.successUrl;
      } else {
        this.cleanup();
      }
    };

    if (this.config.onSuccess) {
      Promise.resolve(this.config.onSuccess(metadata))
        .then(finalize)
        .catch((error) => {
          console.error("[OFAuth] Error in onSuccess callback", error);
          finalize();
        });
    } else {
      finalize();
    }
  }

  private closeListener(event: CustomEvent<CloseMetadata>): void {
    if (event.defaultPrevented) {
      return;
    }

    const finalize = () => {
      this.cleanup();
    };

    if (this.config.onClose) {
      Promise.resolve(this.config.onClose(event.detail))
        .then(finalize)
        .catch((error) => {
          console.error("[OFAuth] Error in onClose callback", error);
          finalize();
        });
    } else {
      finalize();
    }
  }

  private invalidSessionListener(): void {
    if (this.config.onInvalidSession) {
      Promise.resolve(this.config.onInvalidSession()).catch((error) => {
        console.error("[OFAuth] Error in onInvalidSession callback", error);
      });
    }
  }

  private sandboxInfoListener(event: CustomEvent<SandboxInfoMetadata>): void {
    // Always update the sandbox banner when we receive sandbox info
    this.updateSandboxBanner(event.detail);

    if (this.config.onSandboxInfo) {
      Promise.resolve(this.config.onSandboxInfo(event.detail)).catch((error) => {
        console.error("[OFAuth] Error in onSandboxInfo callback", error);
      });
    }
  }

  public addEventListener<T extends keyof LinkEventDetailMap>(
    type: T,
    listener: (event: CustomEvent<LinkEventDetailMap[T]>) => void,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this.eventTarget.addEventListener(type, listener as EventListener, options);
  }

  public removeEventListener<T extends keyof LinkEventDetailMap>(
    type: T,
    listener: (event: CustomEvent<LinkEventDetailMap[T]>) => void,
  ): void {
    this.eventTarget.removeEventListener(type, listener as EventListener);
  }

  /**
   * Initialize embedded Link triggers.
   *
   * This method will add a click event listener to all elements with the `data-ofauth-link` attribute.
   * The Link client session URL is either the `href` attribute for a link element or the value of `data-ofauth-link` attribute.
   */
  public static init(): void {
    const linkElements = document.querySelectorAll<HTMLElement>("[data-ofauth-link]");
    linkElements.forEach((element) => {
      element.removeEventListener("click", OFAuthLinkEmbed.elementClickHandler);
      element.addEventListener("click", OFAuthLinkEmbed.elementClickHandler);
    });
  }

  private static elementClickHandler(event: Event): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement | null;

    if (!target) {
      return;
    }

    const url = target.getAttribute("href") ?? target.getAttribute("data-ofauth-link") ?? undefined;
    const themeAttribute = target.getAttribute("data-ofauth-theme");
    const theme = themeAttribute === "light" || themeAttribute === "dark" || themeAttribute === "auto"
      ? themeAttribute
      : undefined;

    const dispatchSuccess = (metadata: SuccessMetadata) => {
      target.dispatchEvent(new CustomEvent("success", { detail: { metadata } }));
    };

    const dispatchClose = (metadata: CloseMetadata) => {
      target.dispatchEvent(new CustomEvent("close", { detail: { metadata } }));
    };

    const dispatchLoaded = () => {
      target.dispatchEvent(new CustomEvent("loaded"));
    };

    const dispatchInvalidSession = () => {
      target.dispatchEvent(new CustomEvent("invalid_session"));
    };

    let handler = OFAuthLinkEmbed.triggerHandlers.get(target);
    const cachedTheme = target.dataset.ofauthThemeCache ?? "";
    const normalizedTheme = theme ?? "";

    if (!handler || cachedTheme !== normalizedTheme) {
      handler?.destroy();

      handler = OFAuthLinkEmbed.create({
        theme,
        onLoad: dispatchLoaded,
        onSuccess: dispatchSuccess,
        onClose: dispatchClose,
        onInvalidSession: dispatchInvalidSession,
      });

      OFAuthLinkEmbed.triggerHandlers.set(target, handler);
      target.dataset.ofauthThemeCache = normalizedTheme;
    }

    if (url) {
      handler.setUrl(url);
      handler.open();
    } else {
      console.error("[OFAuth] data-ofauth-link element is missing a session URL.");
    }
  }

  private initWindowListener(): void {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("message", this.messageListener);
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
