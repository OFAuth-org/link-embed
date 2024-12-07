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
	type EmbedLinkMessageSuccess,
} from "@ofauth/link-embed"

// create a Link handler
const handler: LinkHandler = await OFAuthLinkEmbed.create({
	url: "https://auth.ofauth.com/s/xxxxxxxxx",
	theme: "dark",
	onLoad: () => {
		console.log("ready")
	},
	onSuccess: (data: EmbedLinkMessageSuccess) => {
		// handle the success event, e.g. redirect to the successURL that was provided when the Link session was created
		if (data.redirect) {
			window.location.href = data.successURL
		}
	},
	onClose: () => {
		console.log("closed")
	},
})

// handler has { open: () => void, close: () => void, destroy: () => void, ready: boolean }
// ready is true when the iframe is fully loaded

// open the Link embed modal
handler.open()

// close the Link embed modal
handler.close()

// destroy and remove all elements from the DOM
handler.destroy()
```

The handler API provides better performance by pre-initializing the login iframe. The iframe is created but hidden when `create()` is called, and only displayed when `open()` is called.

#### Handler API Reference

The `create()` method accepts a configuration object with the following options:

| Option      | Type                | Description                                               |
| ----------- | ------------------- | --------------------------------------------------------- |
| `url`       | `string`            | Required. The Link client session URL                     |
| `theme`     | `'light' \| 'dark'` | Optional. The theme of the embedded Link                  |
| `onSuccess` | `(data) => void`    | Optional. Callback when an account is successfully linked |
| `onLoad`    | `() => void`        | Optional. Callback when the iframe is loaded              |
| `onClose`   | `() => void`        | Optional. Callback when Link embed is closed              |

The `create()` method returns a Promise that resolves to a handler object with the following methods:

| Method      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `open()`    | Opens the Link embed modal                                 |
| `close()`   | Closes the Link embed modal                                |
| `destroy()` | Cleans up the Link embed instance                          |
| `ready`     | Boolean indicating if the Link embed is loaded to be displayed |

### 2. Using the global script

```html
<a
	data-ofauth-link
	href="https://auth.ofauth.com/s/xxxxxxxxx"
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
	url="https://auth.ofauth.com/s/xxxxxxxxx"
	theme="dark"
	label="Login with OFAuth" />

<script>
	// listen for the success event
	const link = document.getElementByTag("ofauth-link")
	link.addEventListener("success", (event) => {
		// handle the success event, e.g. redirect to the successURL that was provided when the Link session was created
		if (data.redirect) {
			window.location.href = data.successURL
		}
	})

	link.addEventListener("close", (event) => {
		console.log("Link closed")
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
| `theme`   | `'light' \| 'dark'` | Optional. The theme of the embedded Link |
| `label`   | `string`            | Optional. The button text                |

### Web Component Events

| Event     | Detail            | Description                         |
| --------- | ----------------- | ----------------------------------- |
| `success` | Link success data | Fired on successful account linking |
| `close`   | None              | Fired when Link is closed           |

## Browser Support

The Link Embed component supports all modern browsers:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
