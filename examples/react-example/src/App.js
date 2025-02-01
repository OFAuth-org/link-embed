import { OFAuthLinkEmbed } from "@ofauth/link-embed"

import "./App.css"
import { useEffect, useState } from "react"

function App() {
	const [handler, setHandler] = useState(null)

	useEffect(() => {
		const createHandler = async () => {
			const linkHandler = await OFAuthLinkEmbed.create({
				url: "https://link.ofauth.com/s/cs_xxxxxxxx", // Replace with your actual client session URL from /init
				theme: "auto",
				onLoad: () => {
					console.log("Link embed ready")
				},
				onSuccess: (data) => {
					console.log("Link embed success", data)
					if (data.redirect) {
						window.location.href = data.successUrl
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
				<h1>OFAuth Link Embed Example</h1>
				<button
					onClick={() => handler?.open()}
					disabled={!handler}
					style={{
						padding: "10px 20px",
						fontSize: "16px",
						borderRadius: "8px",
						backgroundColor: "#007bff",
						color: "#fff",
						border: "none",
						cursor: "pointer",
					}}>
					Login with OFAuth
				</button>
				<p>Click the button above to authenticate with OFAuth</p>
			</header>
		</div>
	)
}

export default App
