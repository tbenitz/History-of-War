# The Living Archive — History of War & Weapons

A complete illustrated, listen-along history website built from **the original uploaded manuscript**: 60 parts, approximately 332,000 words. Designed for GitHub Pages, desktop, mobile, and Chromebooks. No cloud text-to-speech API or key needed.

## What's included

- The **complete text**, separated into 60 navigable parts without changing its wording. The supplied file was named `.html` but actually contains plain-text Markdown headings, so its original bytes are also preserved as `original-manuscript.txt`.
- **True Phonon TTS**, not the browser's standard `speechSynthesis` voice. The official `phonon-tts` npm package runs in a Web Worker using local Wasm or WebGPU. Speech starts incrementally, with pause/resume and previous/next spoken passage.
- **All 102 voices** in Gradium's current public `phonon-voices` catalog, including **37 English** voices (25 standard voices + 12 character voices), and the extra **Reuben** voice built into the model. Select from a searchable library; sample clips come from Gradium, and individual voice embeddings are fetched on first use.
- **English checkpoint limitation:** the free public browser model Phonon 31M speaks English. The 65 other-language voices are also selectable and previewable for experimental cross-language voice rendering, but may sound incorrect when used with the English checkpoint. All 102 voices can be attempted; quality is not guaranteed for non-English embeddings. The multilingual Phonon 40M models are gated, require accepting model terms, and cannot be automatically loaded from Hugging Face by the browser package. To support narration in other languages later, separately host compatible checkpoint files and supply an appropriate `ModelSpec` under the model's license.
- **Saved progress per part** with automatic resume at the last spoken sentence-sized passage in `localStorage`. It does not sync between browsers or devices. If someone clears site storage, the saved position is lost. Export/sync is not implemented.
- **Wikimedia Commons** public API imagery, automatically chosen for historical terms in the text. Images include source/creator/license links. Image matches are approximate; no imagery is invented. Pictures require internet access.
- Text search across all 60 parts, a linked history timeline, adjustable font, playback speed, and chapter completion markers.

## Deploy to GitHub Pages — no Python and no server required

1. **Create a new public GitHub repository** (suggested name: `History-of-War-and-Weapons`).
2. Add *all* source files in this folder to the repository, **including** `.github/workflows/pages.yml`, `book.json`, `voices.json`, `build.mjs`, and `package.json`. Upload the actual files, not the ZIP itself.
3. In your GitHub repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Push to `main`. The included workflow automatically installs Phonon from npm, validates the manuscript/voice list, bundles the needed Wasm and Worker files locally, and deploys the website.
5. Open the Pages link shown in **Actions → Publish History Listener to GitHub Pages → deploy**.

The build process is automated by GitHub Actions; **you do not need to install Node or Python on your Chromebook**. Pages hosting uses HTTPS. It cannot set COOP/COEP headers, so CPU Wasm will usually run **single-threaded** there; WebGPU is available when the listener's browser and GPU support it. The optional `_headers` file is useful when hosting on Cloudflare Pages/Netlify (which support those headers) but is ignored by GitHub Pages.

### For developers using Node 22+

```bash
npm install
npm run check
npm run build
```

Serve the `dist/` folder from any static HTTPS host. **Do not** open the source `index.html` with `file://`: fetch requests and browser module workers require an HTTP(S) origin. The site intentionally loads `./vendor/phonon/index.js` only after `npm run build` produces a locally co-located worker and Wasm bundle. Importing the package from a foreign CDN often breaks the Worker origin; that's why the build step is included.

## Controls

- Play/Pause and skip arrows: play, pause, or move one sentence-sized passage backward/forward. Playback naturally continues through all parts.
- Click any transcript sentence: save that position and begin there on your next playback. If currently playing, it restarts there.
- Drag the chapter slider to jump through the current part.
- Choose a narrator: official sample ▶ previews the voice; **Use** selects any of the 102 voices. The 65 non-English voices are experimental when reading English, and correct other-language narration needs a multilingual checkpoint.
- Auto pictures: Wikimedia image lookups update when the narrated topic changes; image refresh searches again. The source link remains visible for attribution and verification.
- Progress is measured in narration passages, **not exact word- or millisecond-level position**. For reliability, reopening after a closed tab repeats at most the last passage (typically a few seconds), rather than skipping unfinished audio.

## Cost / privacy / licenses

The website and Phonon 31M English model can be run free; internet is used on first run to fetch model weights and a selected voice embedding, plus Wikimedia image lookups. Narration itself is on-device: the manuscript is not sent to a speech service. Fonts load from Google Fonts if available and fall back to local serif/sans-serif otherwise.

- Browser library: [gradium-ai/xn-ptts](https://github.com/gradium-ai/xn-ptts), MIT OR Apache-2.0.
- Public 31M model: [gradium/phonon-31m-en](https://huggingface.co/gradium/phonon-31m-en), Apache-2.0.
- Voice catalog: [gradium/phonon-voices](https://huggingface.co/gradium/phonon-voices), Apache-2.0.
- Images: Wikimedia Commons, with the individual image's license/credit linked in the app. Wikimedia terms and rate limits apply.

## Known limitations and editorial note

This version is a complete working **site implementation**, but Phonon inference and Wikimedia responses need to be exercised on the actual deployed HTTPS site; they could not be run inside the current offline build environment. The supplied manuscript contains some incomplete/repetitive portions and ends mid-sentence. It was **not** silently edited or rewritten; the site displays the supplied wording.

If an image does not match a passage precisely, use the provided original image link to check it. Do not treat search results as verified depictions of specific events. Content and imagery should be reviewed before publishing an educational site.