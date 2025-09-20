import { type LinkHandler, OFAuthLinkEmbed } from "./embed";

type Theme = "light" | "dark" | "auto";

class LinkComponent extends HTMLElement {
  private embedLinkHandler: LinkHandler | null = null;
  private button: HTMLButtonElement;
  private currentTheme: Theme | undefined;

  static get observedAttributes(): string[] {
    return ["label", "url", "theme"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-block;
      }
      .ofauth-link-button {
        padding: 10px 20px;
        font-size: 16px;
        cursor: pointer;
        border: none;
        border-radius: 5px;
        background-color: #007bff;
        color: #fff;
        transition: background-color 0.2s ease-in-out;
      }
      .ofauth-link-button:hover {
        background-color: #0056b3;
      }
      .ofauth-link-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `;

    this.button = document.createElement("button");
    this.button.className = "ofauth-link-button";
    this.button.setAttribute("part", "button");

    this.shadowRoot?.append(style, this.button);

    this.button.addEventListener("click", () => this.handleButtonClick());
  }

  connectedCallback(): void {
    this.currentTheme = this.readThemeAttribute();
    this.syncLabel();
  }

  disconnectedCallback(): void {
    this.destroyHandler();
  }

  attributeChangedCallback(name: string): void {
    switch (name) {
      case "label":
        this.syncLabel();
        break;
      case "url":
        if (this.embedLinkHandler) {
          const url = this.getUrl();
          if (url) {
            this.embedLinkHandler.setUrl(url);
          }
        }
        break;
      case "theme":
        this.currentTheme = this.readThemeAttribute();
        this.resetHandler();
        break;
      default:
        break;
    }
  }

  private handleButtonClick(): void {
    const url = this.getUrl();

    if (!url) {
      console.error("[OFAuth] <ofauth-link> requires a valid 'url' attribute before opening.");
      return;
    }

    if (!this.embedLinkHandler) {
      this.embedLinkHandler = this.createHandler();
    }

    this.embedLinkHandler.setUrl(url);
    this.embedLinkHandler.open();
  }

  private createHandler(): LinkHandler {
    return OFAuthLinkEmbed.create({
      theme: this.currentTheme,
      onLoad: () => {
        this.dispatchEvent(new CustomEvent("loaded", { composed: true }));
      },
      onSuccess: (metadata) => {
        this.dispatchEvent(new CustomEvent("success", { detail: { metadata }, composed: true }));
      },
      onClose: (metadata) => {
        this.dispatchEvent(new CustomEvent("close", { detail: { metadata }, composed: true }));
      },
      onInvalidSession: () => {
        this.dispatchEvent(new CustomEvent("invalid_session", { composed: true }));
      },
    });
  }

  private syncLabel(): void {
    const label = this.getAttribute("label") ?? this.textContent ?? "Connect Account";
    this.button.textContent = label.trim();
  }

  private getUrl(): string | null {
    const url = this.getAttribute("url");
    return url && url.trim().length > 0 ? url.trim() : null;
  }

  private readThemeAttribute(): Theme | undefined {
    const theme = this.getAttribute("theme");
    if (theme === "light" || theme === "dark" || theme === "auto") {
      return theme;
    }
    return undefined;
  }

  private resetHandler(): void {
    if (this.embedLinkHandler) {
      this.destroyHandler();
      // Handler recreated on next click with updated configuration.
    }
  }

  private destroyHandler(): void {
    if (this.embedLinkHandler) {
      this.embedLinkHandler.destroy();
      this.embedLinkHandler = null;
    }
  }
}

customElements.define("ofauth-link", LinkComponent);

export { LinkComponent };
