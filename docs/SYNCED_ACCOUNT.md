# Tumblr: private Wesley1337 pseudo-account, shared across devices

This is a website-only owner-controlled identity. It is not a real Tumblr login. It stores follows, likes, bookmarks, drafts and a personal avatar in Cloudflare D1, not on one device. Guest browsing stays local.

## One-time Cloudflare setup (same existing website)

1. Go to https://dash.cloudflare.com/ and open Workers & Pages > D1 SQL Database > Create database. Name it **tumblr-profile**.
2. In Workers & Pages > TMBLRTM > Settings > Bindings > Add > D1 database, select the new database.
3. Set its binding **Variable name** to exactly **TM_DB**. Save for Production.
4. Under TMBLRTM > Settings > Variables and Secrets > Add, make an encrypted secret **TM_ACCOUNT_PASSWORD** with a unique, randomly generated password at least 8 characters long. Save for Production.
5. Redeploy the latest Production deployment. The first authenticated request automatically creates the profile tables; there is no SQL script to run.
6. Visit https://tmblrtm.pages.dev/api/account?mode=status . You should see configured:true and signedIn:false before you log in.
7. On https://tmblrtm.pages.dev/ open Account from the iPhone tab or click the desktop account profile. Enter your password and sign in. Sign in with the same password on the other device.
8. Optional: select **Import previous local activity** on either device to copy older device-only follows, likes, bookmarks and drafts into the cloud without erasing existing cloud items. Repeat once on the second device if it has different saved data.

Do not share the owner password with anyone, put it in GitHub, or paste it into this chat. The existing TUMBLR_API_KEY remains unchanged.

## What is synchronized

- Handle: **Wesley1337** — a local website nickname, not a Tumblr account.
- Follows, bookmarked posts, liked posts, private text drafts and uploaded personal picture.
- The picture is cropped and compressed in-browser before being stored as a small data image in D1.
- Every signed-in change is sent to the cloud. When you return to the site on another device, it refreshes; Account > Sync also refreshes on demand.
- Anonymous visitors cannot access or edit private profile data. Your sign-in cookie is signed, Secure, HttpOnly and SameSite=Lax. It lasts 30 days. Rotating the password signs you out.
- The app limits bad password attempts per hour. A strong password is essential because this is one private owner account, not a full managed login platform.
- You can browse as a guest without logging in, but that activity stays on the device until imported.
- Uploading an avatar does not post anything to Tumblr. Private drafts do not get published.

For image-aware ranking, connect the additional AI binding described in [VISUAL_DISCOVERY.md](./VISUAL_DISCOVERY.md).

## Discovery in this release

The old manually chosen fandom adjacency list is no longer the primary source of Explore suggestions. The engine uses public surviving post tags, co-occurring tags, reblog sources, the blogs you follow and posts you liked to discover connected public blogs and content. With no history, it rotates broad subjects rather than assigning you a fake nostalgia persona.

The Tumblr API does not expose the full historical 2012 follower/reblog graph. Recommendations are based on actual accessible public posts and will improve as you follow and like more content.

The existing post layout and full-screen photo viewer are intentionally unchanged.

## Implementation

- Server: functions/api/account.js
- Client: src/account.js and src/AccountPanel.jsx
- Database binding: TM_DB; encrypted secret: TM_ACCOUNT_PASSWORD
- Auto-created tables: tm_profile, tm_items, tm_login_limits
- Discovery: src/graphDiscovery.js, with integration in src/LiveArchive.jsx
- Rollback branch: backup/before-synced-profile-20261116

Note: This is appropriate for one privately controlled profile. A public multi-user platform would need stronger managed authentication, formal migrations and object storage for avatars.
