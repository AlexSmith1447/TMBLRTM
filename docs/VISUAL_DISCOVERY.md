# Tumblr Time Machine — account and visual discovery setup

Implementation date: November 17, 2026.

This is not an official Tumblr account or Tumblr's proprietary recommendation algorithm. The owner account and local actions belong to this website; discovery uses real surviving public Tumblr posts, Cloudflare's Google EmbeddingGemma 2 multimodal embeddings, cosine similarity, and Maximal Marginal Relevance (MMR) diversification.

## Required Cloudflare configuration (same project)

Open https://dash.cloudflare.com/ → Workers & Pages → TMBLRTM.

### 1. Account storage: Cloudflare D1

If you haven't already completed SYNCED_ACCOUNT.md:

1. Create a D1 database named tumblr-profile under the Cloudflare dashboard's D1 SQL Databases section.
2. Under TMBLRTM → Settings → Bindings, add this D1 database.
3. Binding/variable name: TM_DB. Link it to tumblr-profile.
4. Under TMBLRTM → Settings → Variables and Secrets, add an encrypted Secret named TM_ACCOUNT_PASSWORD. Enter your chosen private owner password. The code accepts passwords of 8 characters or longer. The value must never be committed to GitHub or added to the frontend.
5. Save for Production.

The website-only account handle is Wesley1337. This is one owner profile, not public registration or Tumblr OAuth. Follows, likes, saved-post references, private drafts and avatar are stored in D1 and can be retrieved across devices.

A common password remains guessable on a publicly reachable site despite login throttling. This is a deliberate owner-controlled choice, not a recommendation to use weak passwords.

### 2. Image discovery: Workers AI binding

1. Under the same TMBLRTM → Settings → Bindings, add a Workers AI binding.
2. Binding/variable name: AI (capital letters).
3. Save for Production. You do not need another API key or a Vectorize database: the existing D1 database stores temporary 256-dimensional vectors.
4. Redeploy the latest production version.

Model: @cf/google/embeddinggemma-2. It accepts real images plus captions, maps them to a shared embedding space, and supports 256-dimension vectors.

Cloudflare documentation:
- https://developers.cloudflare.com/workers-ai/models/embeddinggemma-2/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/d1/
- https://developers.cloudflare.com/workers-ai/configuration/bindings/

### 3. Verify

- Account: https://tmblrtm.pages.dev/api/account?mode=status
  - Expected: configured:true, handle:Wesley1337.
- Visual model: https://tmblrtm.pages.dev/api/visual?mode=status
  - Expected: configured:true, model:@cf/google/embeddinggemma-2.
  - indexed:0 is normal before you browse Explore.

Open https://tmblrtm.pages.dev/ → Account → Sign in using your owner password. Optional: Import previous local activity from each device to merge previous follows, likes and bookmarks.

## Verify real AI inference (not merely bindings)

The public /api/visual?mode=status route only verifies Cloudflare bindings.
It now also reports **indexed** and **imageEmbeddings**: these counters are
zero when there are no successful temporary embeddings and/or no actual
image embeddings, respectively. An indexed *text-only* fallback is not counted
as a real image embedding.

To verify the actual model, sign into **Wesley1337**, open Account and press
**Test AI**. The test reports:
- Whether an actual EmbeddingGemma 2 text inference returned valid 256-D vectors
- Whether an actual image + text inference returned a valid image embedding
- Number of non-expired D1 records and how many were created from real images
- A brief error reason when either inference fails, without disclosing keys

The test requires a photo already retrieved and temporarily indexed through
Explore. If it reports "Not yet available" for image inference, browse some
image posts in Explore, then retry. The test may consume one or two model
inference calls on your Workers AI allocation. It does not prove the *quality*
of suggested posts; evaluate that using clicks, likes and recommendation
relevance once the index is nonempty.

Cloudflare documentation on November 17, 2026: Workers AI Free includes
10,000 Neurons per day across model use, resetting at 00:00 UTC. Going over
the free allocation on Workers Free causes operations to fail (not a
postpaid surprise bill); Workers Paid may charge beyond free allocation.
EmbeddingGemma 2 is not listed among paid-only models. Cloudflare lists
the model's unit price at $0.0017 per million input tokens.
Sources:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/embeddinggemma-2/

## November 17 fix: previously all records were caption-only

The site was selecting full-resolution Tumblr originals for embedding and rejecting
anything over 1.25 MB. Some photos also use GIF, AVIF or redirecting media links.
This could leave the index with valid *text* embeddings and zero actual images
even though Workers AI was functioning.

The importer now preserves thumbnail/alternative URLs returned by Tumblr's
official legacy photo alt_sizes and NPF media[] fields. The original source
image remains unchanged for normal display. The private Worker tries actual
smaller variants before the original, streams responses with a 2.1 MB cap,
follows only redirects to trusted Tumblr media hosts, and reports concrete
failure categories (HTTP status, unsupported GIF, oversized image, timeouts).

Old caption-only records are eligible for a one-time upgrade when the new
thumbnail metadata is discovered, rather than triggering unlimited retries.

**To verify a real fix:** after Pages has redeployed, visit Explore while
signed in, load a few pages of real posts containing static photos, then use
Account > Test AI. The diagnostic should say Live image embedding: Working
and show >0 actual image embeddings once image indexing succeeds. If it does
not, copy the **Download diagnosis** counts; e.g., "http 403: 3" indicates
a different upstream CDN issue than "animated gif: 3". The dashboard remains
usable via caption-based fallback even if photos can't be embedded.

This is verified by source-code inspections and mocked regression tests, NOT
by a live Cloudflare Workers AI+Tumblr image inference on the owner's account.
The test control is the direct production check.

## How Explore uses images

1. The existing official Tumblr API key (TUMBLR_API_KEY) retrieves real surviving public posts; no invented images.
2. When signed in, the app chooses up to five Tumblr photo posts per fetch and sends metadata to /api/visual.
3. The Cloudflare Function validates media URLs (Tumblr CDN only), downloads bounded image bytes, and embeds image + caption with Workers AI. Unavailable, large or unsupported images fall back to caption embeddings when possible.
4. D1 stores normalized public post metadata and 256-dimension vectors for no more than 60 hours. Media bytes are not retained. Expired entries are deleted automatically on later index or recommendation requests.
5. Explore ranks temporarily indexed posts using cosine similarity to your likes/saves, then MMR for diversity and limits on repeated blogs and duplicate image URLs.
6. Find similar images on a post performs a post-to-post query using that post's vector.
7. Guests, missing model connections and empty indexes keep the existing tag/reblog historical discovery fallback.
8. This is incremental: an embedding model cannot discover historical Tumblr posts the Tumblr API never returned.

The 60-hour retention is intended to remain below Tumblr's three-day API content caching limit. Personal account preferences persist; the temporary similarity index is not a permanent copy of Tumblr's content.

## Limits

- Up to five image embeddings attempted per owner request.
- Owner-side daily cap: 120 new embedding attempts in D1. Already indexed IDs are skipped.
- Cloudflare Workers AI usage is subject to the account plan and daily allocation.
- D1 retrieves a bounded collection of 750 recently indexed items. For a much larger corpus, use Vectorize 256-dimensional cosine indexes later.
- A few animated GIFs may be represented only through text until frame-extraction support is added.

## Source

- functions/api/account.js — pseudo-account, private Cloudflare Secret
- src/account.js, src/AccountPanel.jsx — account UI and cross-device preferences
- functions/api/visual.js — model inference, temporary D1 catalog
- src/visualRanking.js — cosine/MMR image-based ranking
- src/LiveArchive.jsx — Explore integration and Find Similar actions
- scripts/test-visual.mjs — unit tests
- Backup branch: backup/pre-visual-discovery-20261117

The existing 2012 visual theme is intentionally unchanged; polish can follow after discovery validation.
