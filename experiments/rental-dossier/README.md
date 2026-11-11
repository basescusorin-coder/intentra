# INTENTRA rental dossier prototype

Standalone static prototype for an automated rental application dossier. Open `index.html` in a modern browser. It needs no build step or backend.

## Included

- Romanian, German and English interface and generated document.
- Client-side form, escaped preview, optional document checklist, clear button and print-to-PDF.
- No account, analytics, cookies, upload, server request, payment or email delivery.
- Form state exists in memory only and is lost on refresh.

## Verify

1. Open the HTML file directly in a browser.
2. Switch each language and generate a dossier using fictional values.
3. Try quotes, ampersands and `<script>` in text fields; the preview should render them as text.
4. Verify that print preview contains only the document, then clear the form and refresh.
5. Inspect browser Network tools: the page should make no requests.

This is an evaluation prototype. It is not connected to the public INTENTRA site and is not ready to accept payments or collect customer data.
