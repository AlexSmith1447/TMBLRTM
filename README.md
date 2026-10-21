# Tumblr Time Machine

A nostalgic, independent historical Tumblr browser, styled after the 2011–2013 dashboard.

**Live deployment:** https://tmblrtm.pages.dev/

## Features

- Classic navy dashboard, period-style seven post-type toolbar, compact white feed, offset avatars and sidebar.
- Dedicated Culture Clock with historical milestones, filters, year/month zoom and connected culture.
- Real, public Tumblr posts from a selected historical cutoff using a server-side Pages Function.
- Tumblr blog importer, global tag search, post-type filters, text filtering of loaded results and paginated results.
- Links to original posts, locally saved/liked posts and local personal time-capsule notes.
- Honest demo mode when a Tumblr API key isn't configured.

## Enable real historical Tumblr posts (Cloudflare Pages)

1. At https://www.tumblr.com/oauth/apps, register an application. Set its website to `https://tmblrtm.pages.dev/` when asked. Public post retrieval does **not** require the user's OAuth login.
2. Copy the application's **OAuth Consumer Key** (the `api_key`). **Do not paste it into GitHub or public chat.**
3. In Cloudflare: **Workers & Pages → TMBLRTM → Settings → Variables and Secrets → Add**.
4. Set the name to `TUMBLR_API_KEY`, paste the **OAuth Consumer Key** as the value and choose **Encrypt / Secret**. Save it for **Production** (optionally Preview).
5. **Redeploy** the current Pages deployment or push a new commit so the Function starts with that binding.
6. Visit `https://tmblrtm.pages.dev/api/tumblr?mode=status` to check that `configured` is `true`. Refresh the website; the archive defaults to real public Tumblr posts.

Secrets are read only by `functions/api/tumblr.js` through `context.env`. Never put an API key into a React/Vite environment variable prefixed with `VITE_`, which would publish it to visitors.

## How archive retrieval works

- **By blog**: Uses `GET /v2/blog/{blog}.tumblr.com/posts` with an epoch `before` boundary and `offset` pagination.
- **By tag**: Uses `GET /v2/tagged` with `tag` and a `before` boundary.
- The server normalizes public post types, images, timestamps, notes, tags and original post links into a safe JSON response.
- React renders normalized text as text rather than directly injecting Tumblr's HTML, reducing untrusted-content risk.
- Tumblr's API is neither a complete historical snapshot nor a guarantee that deleted/hidden posts or original media survive. Only accessible results are shown.
- The date cutoff is applied both on the Tumblr request and again to displayed posts; type and text filters act on the **loaded results only**.
- Likes/bookmarks/notes are in localStorage, not synced across devices and not sent to Tumblr.
- Global tag retrieval can be incomplete or restricted by Tumblr; the website does not claim complete search coverage.

## Local development

```sh
npm install
npm run dev
npm test
npm run build
```

For local Pages Functions, use `wrangler pages dev dist` with a **local** secret binding after building; Vite's dev server alone does not run the Functions. Keep local `.dev.vars` untracked.

### Cloudflare settings

- Build command: `npm run build`
- Output directory: `dist`
- Production branch: `main`
- Functions directory: `functions/` at repository root (automatically detected by Pages)

## Non-affiliation

Not affiliated with or endorsed by Tumblr. Posts remain owned by their original authors. Historical culture markers include source references and distinguish exact dates from approximate waves.
