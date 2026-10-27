# Accordiv landing and demo

Public source: [belloabdulwahab/accordiv-demo](https://github.com/belloabdulwahab/accordiv-demo) - branch **main**. GitHub publication completed on 27 October 2026. **Netlify is not connected and this repository has not been deployed.**

Generated from the authoritative private Accordiv source. Make changes upstream and rerun its `npm run export:demo`; direct edits to generated files are refused on the next export. This repository has no owner authentication, API, PHP or database. Owner Account is visibly unavailable; the independent demo uses fictional per-tab sessionStorage, migration of existing demo keys and Reset Demo. PDFs are labelled demonstrations. No payment or invoice email is sent.

Requires Node 22.12+ (Netlify uses Node 22) and npm:

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
# Or serve the build:
npm run preview
```

Local URL: http://127.0.0.1:5174/ . Hash routes work on static hosting. No backend or environment secrets are needed. Build output is `dist/`.

## Netlify preparation - not deployed

Use `npm run build`, publish `dist`, Node 22 as specified in netlify.toml. Enable Forms detection and redeploy; confirm `accordiv-enquiry`, all matching fields and `bot-field` honeypot from index.html. React sends URL-encoded form data only when Netlify's processed static form is detected. Local/unconfigured builds honestly refuse online sending; WhatsApp/email remain available. Configure Forms submission email notifications to **belloabdulwahab266@gmail.com** and test actual delivery and Reply-To after deployment. No SMTP credentials, PHP or database are involved. Detection and real email delivery remain unverified before deployment.

See [Netlify form setup](https://docs.netlify.com/manage/forms/setup/), [spam filters](https://docs.netlify.com/manage/forms/spam-filters/) and [notifications](https://docs.netlify.com/manage/forms/notifications/).

The full application remains private. Full owner hosting on Truehost is deferred; hosted multi-business accounts are future V2 work. This public source is generated upstream; export does not commit, push or deploy it. Personal notes, backend/owner modules, private configuration and database data are excluded. Byte-preserving Git attributes keep generated files consistent with the export manifest.

## Verified source and next connection settings

61 serial tests, lint and production build passed. A fresh one-worker Chrome run passed 58 checks with zero API requests, including unavailable owner navigation/direct URLs, demo workflows, matching form fields/honeypot and a demo PDF. Real Netlify form/email/Reply-To delivery remains unverified; local test responses were intercepted, not live enquiries.

When a Netlify connection is separately authorized, select this repository and production branch main. Leave base/package directories blank (repository root), use npm run build, publish dist and Node 22. No private environment variables, PHP or database are required. Enable Forms detection and configure the email notification described above, then verify delivery after deployment. No GitHub Pages, software license, package publication or deployment workflow was added here.
