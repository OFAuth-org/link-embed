import { OFAuthLinkEmbed } from "@ofauth/link-embed"
import "./App.css"
import { useEffect, useState } from "react"

function App() {
	const [handler, setHandler] = useState(null)

	useEffect(() => {
		const createHandler = async () => {
			const linkHandler = await OFAuthLinkEmbed.create({
				url: "https://auth.ofauth.com/s/dpvv211fnfmuqi5l23x8xsbq4btmw0n6", // Replace with your actual session URL
				theme: "dark",
				onLoad: () => {
					console.log("Link embed ready")
				},
				onSuccess: (data) => {
					if (data.redirect) {
						window.location.href = data.successURL
					}
				},
				onClose: () => {
					console.log("Link embed closed")
				},
			})
			setHandler(linkHandler)
		}

		createHandler()

		// Cleanup on unmount
		return () => {
			if (handler) {
				handler.destroy()
			}
		}
	}, [])

	return (
		<div className="App">
			<header className="App-header">
				<h1>OnlyFans Auth Link Embed Example</h1>
				<button onClick={() => handler?.open()} disabled={!handler?.ready}>
					Login with OFAuth
				</button>
				<p>Click the button above to authenticate with OnlyFans</p>
			</header>
		</div>
	)
}

export default App
