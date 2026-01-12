# @ofauth/link-embed

## 5.0.0

### Major Changes

- bab3152: Add sandbox info banner

## 4.0.0

### Major Changes

- 0f6afe5: Revamped the Link Embed surface so it is easier to handle invalid sessions, exiting/closing the embed, and more.

## 3.0.0

### Major Changes

- e60668e: changed base url to link.ofauth.com

## 2.1.0

### Minor Changes

- 5337b31: standardized naming of object keys from Link Success Message, "successUrl"
  Minor only change due to the fact that most people are not using both an embed and a redirect.

## 2.0.8

### Patch Changes

- ae23c2c: feat: close embed on success event
- 5a07775: fix: remove references to elements after removal

## 2.0.7

### Patch Changes

- 0781238: fix: ensure no error on dom element removal

## 2.0.6

### Patch Changes

- 09f2aa7: feat: get user data on success

## 2.0.5

### Patch Changes

- bbc99b1: fix: check for invalid url

## 2.0.4

### Patch Changes

- 18c3d12: fix: exit -> close event on web component
- 53ef448: fix: webcomponent event propogation

## 2.0.3

### Patch Changes

- 551061b: fix: allow reopening embed, load iframe on open not init
- ab76555: fix: don't output sourcemap

## 2.0.2

### Patch Changes

- 4eb98fa: fix: treeshake component
- 2c9de70: fix: readme didn't get copied over in the mono-repoization

## 2.0.1

### Patch Changes

- fc7edc3: Fixed onload not firing
