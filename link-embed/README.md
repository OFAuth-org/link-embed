# OFAuth

This repository contains the official package for embedding OFAuth Link into your applications.

## Installation

```bash
npm install @ofauth/link-embed
```

## Usage

Depending on your use case, there are a few different ways to use the integrate the OFAuth Link Embed.

Before using the OFAuth Link Embed, first create a [Link client session](https://docs.ofauth.com/guide/OnlyFans-authentication/Integrating).

### 1. Using the ES Module

```ts
import {
  OFAuthLinkEmbed,
  type LinkHandler,
  type SuccessMetadata,
  type CloseMetadata,
} from "@ofauth/link-embed";

const handler: LinkHandler = OFAuthLinkEmbed.create({
  theme: "auto",
  onLoad: () => {
    console.log("Link ready");
  },
  onSuccess: async (metadata: SuccessMetadata) => {
    console.log("Authentication successful", metadata.connection.id);

    if (metadata.redirect) {
      window.location.href = metadata.successUrl;
    }
  },
  onClose: (metadata: CloseMetadata) => {
    console.log("Embed closed", metadata.type);
  },
  onInvalidSession: async () => {
    const response = await fetch("/api/new-link-session");
    const { url } = await response.json();
    handler.open(url);
  },
});

// Later, when you have a session URL available
handler.open("https://link.ofauth.com/s/cs_xxxxxxxxx");

// Force the embed to exit immediately
handler.close({ force: true });

// Manually remove DOM elements if you no longer need the handler
handler.cleanup();

// Fully tear the handler down (removes listeners and styles)
handler.destroy();
```

The handler API pre-initialises the iframe so subsequent openings are instantaneous. Create the handler once and re-use it with new session URLs via `open(url)` or `setUrl(url)`.

#### Handler API Reference

The `create()` method accepts a configuration object with the following options:

| Option      | Type                | Description                                               |
| ----------- | ------------------- | --------------------------------------------------------- |
| `url`       | `string`                          | Optional. Default Link session URL. Pass one later to `open()` or `setUrl()`. |
| `theme`     | `'light' \| 'dark' \| 'auto'`     | Optional. Theme for the embedded Link (default: `auto`). |
| `onSuccess` | `(metadata: SuccessMetadata) => void \| Promise<void>` | Optional. Called when authentication succeeds. Awaited if it returns a promise. |
| `onClose`   | `(metadata: CloseMetadata) => void \| Promise<void>`   | Optional. Called when the embed closes. Awaited if it returns a promise. |
| `onLoad`    | `() => void \| Promise<void>`      | Optional. Called when the iframe is ready. |
| `onInvalidSession` | `() => void \| Promise<void>` | Optional. Called when the session is invalid or expired. |

The `create()` method returns a Promise that resolves to a handler object with the following methods:

| Method      | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `open(url?: string)` | Opens the Link embed modal. Optionally provide a session URL. |
| `setUrl(url: string)` | Updates the session URL used for the next `open()`. |
| `close(options?: { force?: boolean })` | Requests the embed to close. Pass `{ force: true }` to immediately tear it down. |
| `cleanup()` | Removes the iframe/overlay from the DOM while keeping the handler reusable. |
| `destroy()` | Fully disposes the handler, removing injected styles and listeners. |
| `ready`     | Getter indicating whether the iframe has emitted the `loaded` event. |

### 2. Using the global script

```html
<a
	data-ofauth-link
	href="https://link.ofauth.com/s/cs_xxxxxxxxx"
	data-ofauth-theme="light"
	>Login with OFAuth</a
>

<!-- Initialize the embed -->
<script
	src="https://unpkg.com/@ofauth/link-embed/dist/embed.global.js"
	defer
	data-auto-init></script>

<!-- or manually initialize the embed, if you're using a javascript framework or bundler -->
<script>
	import { OFAuthLinkEmbed } from "@ofauth/link-embed"
	OFAuthLinkEmbed.init()
</script>
```

To import the Web Component:

```ts
import "@ofauth/link-embed/component"
// or from: https://unpkg.com/@ofauth/link-embed/dist/component.js
```

Usage:

```html
<ofauth-link
	url="https://link.ofauth.com/s/cs_xxxxxxxxx"
	theme="dark"
	label="Login with OFAuth" />

<script>
	const link = document.querySelector("ofauth-link")

	link.addEventListener("loaded", () => {
		console.log("Link ready")
	})

	link.addEventListener("success", (event) => {
		const { metadata } = event.detail
		console.log("Link success", metadata.connection.id)
	})

	link.addEventListener("close", (event) => {
		const { metadata } = event.detail
		console.log("Link closed", metadata.type)
	})

	link.addEventListener("invalid_session", () => {
		console.log("Session expired")
	})
</script>
```

> [!TIP]
> You can style the trigger element any way you want, just make sure to keep the
> `data-ofauth-link` attribute.

### Web Component Attributes

| Attribute | Type                | Description                              |
| --------- | ------------------- | ---------------------------------------- |
| `url`     | `string`            | Required. The Link client session URL    |
| `theme`   | `'light' \| 'dark' \| 'auto'` | Optional. The theme of the embedded Link |
| `label`   | `string`            | Optional. The button text                |

### Web Component Events

| Event             | Detail                                     | Description                         |
| ----------------- | ------------------------------------------ | ----------------------------------- |
| `loaded`          | `null`                                     | Fired when the iframe is ready.     |
| `success`         | `{ metadata: SuccessMetadata }`            | Fired on successful account linking |
| `close`           | `{ metadata: CloseMetadata }`              | Fired when Link is closed           |
| `invalid_session` | `null`                                     | Fired when the session is invalid   |

## Browser Support

The Link Embed component supports all modern browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
