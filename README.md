# Accordiv landing and demo

Live site: **https://accordiv-demo.netlify.app**

Public source: [belloabdulwahab/accordiv-demo](https://github.com/belloabdulwahab/accordiv-demo), branch **main**. GitHub publication completed on 27 October 2026; the public Netlify deployment is now complete. This branch is connected for automatic public deployment.

Generated from the authoritative private Accordiv source. Make changes upstream and rerun its `npm run export:demo`; direct edits to generated files are refused on the next export. This repository has no owner authentication, API, PHP or database. Owner Account is visibly unavailable, including direct owner URLs. The independent demo uses fictional per-tab sessionStorage, migration of valid existing demo keys and Reset Demo. PDFs have demonstration labels and a demo-only geometric watermark. No payment or invoice email is sent.

## Local development

Requires Node 22.12+ (Netlify uses Node 22) and npm:

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev
# Or, after stopping dev, serve the build:
npm run preview
```

Local URL: http://127.0.0.1:5174/ . Hash routes work on static hosting. No backend or private environment variables are needed. Build output is `dist/`. Run ci for fresh installs or lockfile changes, not each start. Stop the foreground dev/preview server with Ctrl+C.

## Deployment and enquiry status

Netlify builds public **main** using **npm run build**, publishes **dist**, and uses **Node 22**, as specified in netlify.toml/.nvmrc. Base/package directories are the repository root. A push to this branch can trigger automatic deployment; a local export/build/commit does not update the live site by itself.

Form detection and enquiry notifications are configured. **User-verified production checks, 28 October 2026:** the website displayed success; the submission appeared in Netlify under **accordiv-enquiry**; notification arrived at **belloabdulwahab266@gmail.com**; and Reply-To matched the entered email. These were reported by the project owner, not independently repeated during this documentation update. A successful launch test is not a guarantee of future delivery.

The hidden static form in index.html must retain fields matching React and the **bot-field** honeypot. React posts URL-encoded data to Netlify only when the processed static definition is detected. Local/unconfigured builds honestly refuse sending; direct WhatsApp/email remain available. No SMTP credentials, PHP or database are involved. Changing public contact source does not change Netlify's notification settings automatically.

If a live notification is missing, check the named form's submissions/spam, detection, notification recipient and email filters/quotas. No live enquiry was sent during this documentation update.

See [form setup](https://docs.netlify.com/manage/forms/setup/), [spam filters](https://docs.netlify.com/manage/forms/spam-filters/) and [notifications](https://docs.netlify.com/manage/forms/notifications/).

## Source boundaries and verification

The full owner application remains local/private. Truehost full-stack hosting is deferred; hosted multi-business accounts are future V2 work. Personal handbooks, private technical guides, backend/owner modules, configuration and database data are excluded. Byte-preserving Git attributes keep managed files consistent with the export manifest.

Historical checks on **27 October 2026**: 61 serial tests, clean lint/build and 58 one-worker Chrome checks with zero public API requests, including unavailable owner routes, demo workflows, static/React field parity and a labelled PDF. Local form responses were controlled then; they did not prove production delivery. The later user-verified live test is recorded above.

The **1 November documentation update** refreshed this README through the exporter; 13 focused serial export/recovery checks passed upstream, including private-guide exclusion. Public managed hashes/exclusions were checked; it did not rerun the full application suite or complete remaining Batch 6 acceptance work. Clean-machine recovery/database restoration of the private app, broader browser/device/accessibility testing and hosted owner checks remain outside this public launch result.
