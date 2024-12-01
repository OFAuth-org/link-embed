<!-- 
 This example demonstrates how to use the OFAuth Link Embed component in a Svelte app.

 There are 3 ways shown in this example:
 1. Using the web component (auto initialized)
 2. using any html element with the data-ofauth-link attribute (manually initialized)
 3. Using a LinkHandler (for more control)

-->

<script lang="ts">
	import { onMount } from "svelte"
	import { OFAuthLinkEmbed, type LinkHandler } from "../../../src/embed.ts"
	// or
	// import { OFAuthLinkEmbed, type LinkHandler } from "@ofauth/link-embed"

	let loginButton

	let url = "https://auth.ofauth.com/s/demo"

	let handler: LinkHandler

	onMount(async () => {
		// 2: this initializes any element with the data-ofauth-link attribute
		OFAuthLinkEmbed.init()
		
		// 3: create a login handler
		handler = await OFAuthLinkEmbed.create({
			url,
			theme: "light",
		})
		// handler has { open: () => void, close: () => void, destroy: () => void, ready: boolean }
		// ready is true when the iframe is fully loaded
	})
</script>

<main>
	<div class="container">
		<div
			class="header"
			style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 2rem;"
		>
			<h1>OFAuth Link Embed Examples</h1>
			<div>
				<a href="https://docs.ofauth.com" target="_blank"> (Go to Docs) </a>
			</div>
		</div>

		<div class="card">
			<!-- Using the web component -->
			<ofauth-link bind:this={loginButton} {url} label="Login with OFAuth" />
		</div>

		<div class="examples">
			<h2>Alternative Implementation, using OFAuthLink.init()</h2>
			<!-- Using data attributes approach -->
			<a href={url} data-ofauth-link class="alt-login">
				Login with data-attribute
			</a>
		</div>

		<div class="examples">
			<h2>Using the LinkHandler</h2>
			<button on:click={handler.open}>Open Link</button>
		</div>
	</div>
</main>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		text-align: center;
	}

	.card {
		padding: 2rem;
		border-radius: 8px;
		background: #f9f9f9;
		margin: 2rem 0;
	}

	.examples {
		margin-top: 2rem;
		padding: 1rem;
		border-top: 1px solid #eee;
	}

	.alt-login {
		display: inline-block;
		padding: 10px 20px;
		background: #47e76c;
		color: white;
		text-decoration: none;
		border-radius: 5px;
		margin-top: 1rem;
	}

	h1 {
		color: #333;
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.2rem;
		color: #666;
		margin-bottom: 1rem;
	}

	@media (prefers-color-scheme: dark) {
		h2 {
			color: rgb(240, 240, 240);
		}
		h1 {
			color: rgb(249, 249, 249);
		}

		body {
			background-color: #121212;
		}
	}
</style>
