# Late-2012 Tumblr visual direction

This project is an independent historical Tumblr browser. The **normal dashboard** should look and behave like a period website; the **Time Machine** tool is a discreet utility behind the clock icon.

## Design target

The initial authentic mode is **late 2012, desktop Tumblr**. Avoid mixing every historical Tumblr design into one interface. Evidence that contextualizes the target:

- The Next Web, 28 February 2012: [Tumblr refreshes the dashboard publishing icons](https://thenextweb.com/news/popular-publishing-site-tumblr-refreshes-its-dashboard)
- The Next Web, 7 September 2012: [Tumblr dashboard sidebar/stats refinements](https://thenextweb.com/news/tumblr-refines-logged-experience-new-enhancements-dashboard)

The user's reference screenshot supplied in the conversation is the most useful specific target for visual proportions. The period references establish a coherent era; they are not a license to copy copyrighted imagery or imply official affiliation.

## Default dashboard principles

- Dark blue background, compact white post cards, avatars offset outside each post, narrow sidebar.
- Native-looking small typography and restrained border/shadow treatments.
- One visually continuous feed, not isolated modern content cards.
- Colored seven-post-type composer icons with minimal separators.
- Period-appropriate focus/hover states; subtle bevel in tiny menu controls, not everywhere.
- Real followed blog count and real Tumblr post data. Do **not** invent historical popularity counts, follower counts, views, trending rates or fake community activity.
- The classic Tumblr navigation should **not** prominently say archive, historical, time travel, demo, API, or old web. Put meta-settings and caveats into the hidden Time Machine panel.
- Posts and images belong to their original authors. Link back to the Tumblr original when available.
- Maintain responsive behavior, keyboard focus, and reduced-motion support.

## Component/style boundaries

| Component | File |
|---|---|
| Dashboard shell, sidebar, composer, hidden controls | `src/main.jsx` and `src/style.css` |
| Era-specific dashboard appearance | `src/classic2012.css` |
| Post/feed behavior | `src/LiveArchive.jsx` and `src/live.css` |
| Individual blog themes | `src/blog.css` |
| Search dropdown | `src/search.css` |
| Photo viewer/photosets | `src/photosets.css` |
| Cultural historical events | `src/cultureData.js` and `src/CultureTimeline.jsx` |

Later 2010–11 and 2013–14 themes should be separate files selected by the hidden Time Machine, not scattered new overrides or automated historical page changes that the user cannot control.

## Release checks

1. Run `npm test` and `npm run build`.
2. Confirm Tumblr's `/api/tumblr?mode=status` endpoint remains independent of visual styles.
3. Click inside the search field and inspect the dropdown (previous regression: a missing imported JSX icon caused the page to go blank).
4. Verify blog visit → theme choice → archive month → reblog trail → photo viewer.
5. Test wide desktop (~1440px), compact desktop (~900px), and mobile (~375px).
6. Verify that opening the clock exposes the Time Machine and that the normal dashboard stays free of meta labels.

## Current constraints

Tumblr's public API does not restore deleted posts or reconstruct the exact old appearance of edited posts. Blog layout presets are period-inspired styling, not recovered historical CSS. This distinction should remain accessible in the hidden information panel.
