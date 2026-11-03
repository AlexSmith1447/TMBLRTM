## 2012 Tumblr iPhone mode (same Cloudflare site)

SceneIndex is a separate project. This website has an **iPhone-specific Tumblr 3.0 interface** based on the real June–November 2012 iOS app, not a resized desktop dashboard.

- The site automatically uses its period-style mobile UI for iPhones and other phone-sized screens, while wide desktop browsers keep the classic 2012 website.
- The iPhone interface has Dashboard, tag search, Account and the black, colorful post-type chooser; it shares the **same real Tumblr archive data**, historical date cutoff, followed blogs, locally liked posts and bookmarks.
- Photos open the existing full-resolution lightbox. Text in the Post chooser saves a **private local draft**; other types browse that type of archived post. There is **no Tumblr login or publication**.
- Tap the small clock in the upper-right corner for the Time Machine and Culture Clock.
- The iPhone has a custom `tumblr.` 180px Home Screen icon and `/manifest.webmanifest` with standalone launch settings.
- Supported iPhone and iPad Safari versions let you launch the site from the Home Screen **without a browser address bar**. Browser-based PWAs cannot replace the operating system's real status indicators or install Apple's original discontinued app.

### Install on iPhone

1. Open `https://tmblrtm.pages.dev/` in Safari.
2. Open Safari's **Share** menu (on recent Safari versions, first open the Page Menu).
3. Tap **Add to Home Screen**.
4. Enable **Open as Web App** if this option appears, then tap **Add**.

The icon will launch this same website in its standalone app-style window. If you already installed an older icon, remove that Home Screen shortcut and add it again to pick up the new name/icon.

**Offline note:** The shell is intended for online Tumblr archive browsing. It doesn't claim to download and preserve original media for offline access, and it cannot show deleted posts that Tumblr no longer exposes.

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
