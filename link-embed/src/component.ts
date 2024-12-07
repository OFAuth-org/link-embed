import { type LinkHandler, OFAuthLinkEmbed } from "./embed";

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
                        this.dispatchEvent(new CustomEvent('close'));
                    }
                });
            }

            this.embedLinkHandler.open();
        }
    }
}

customElements.define('ofauth-link', LinkComponent);

export { LinkComponent };