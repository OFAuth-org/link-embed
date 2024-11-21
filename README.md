# `@ofauth/login-embed`

This package contains JavaScript utilities to easily integrate OFAuth Account Login into your website or application.

Embedded Login allows you to onboard users to your website or application, without redirecting them to OFAuth. This can be useful if you want to keep the user experience on your website.

You can either copy and paste our code snippet to get up and running in a second or use our JavaScript library for more advanced integrations.

### Code snippet

The code snippet can be used on any website or CMS that allows you to insert HTML.

First, create a [Login Session](https://docs.ofauth.com/guide/OnlyFans-authentication/Integrating).

The snippet looks like this:

```html
<a
  href="__LOGIN_LINK__"
  data-ofauth-login
  data-ofauth-login-theme="light"
>
  Purchase
</a>
<script
  src="https://unpkg.com/@ofauth/login-embed@^1.0.0/dist/embed.global.js"
  defer
  data-auto-init
></script>
```

This will display a `Link Account` link which will open an inline login (popup) when clicked.

> [!TIP]
> You can style the trigger element any way you want, as long as you keep the
> `data-ofauth-login` attribute.

### Import library

If you have a more advanced project in JavaScript, like a React app, adding the `<script>` tag may not be an option. In this case, you can install our dedicated library.

```bash
npm install @ofauth/login-embed
```

Then, you should import the `OFAuthEmbedLogin` helper class and manually call `OFAuthEmbedLogin.init()`. This will add the required handlers on elements having the `data-ofauth-login` attribute.

Here is an example in React:

```tsx
import { OFAuthEmbedLogin } from '@ofauth/login-embed'
import { useEffect } from 'react'

const LinkAccount = () => {
  useEffect(() => {
    OFAuthEmbedLogin.init()
  }, [])

  return (
    <a
      href="__LOGIN_LINK__"
      data-ofauth-login
      data-ofauth-login-theme="light"
    >
      Link Account
    </a>
  )
}

export default LinkAccount
```
