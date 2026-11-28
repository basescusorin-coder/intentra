# INTENTRA unified preview

The Vercel `intentra-comunitate-preview` project is configured with repository root as source, output `dist`, and a build that copies the existing root homepage and assets to `/` and builds the Vite community application to `/comunitate/`.

The homepage remains the existing six-category search interface plus a seventh Community tile. Community navigation is via `/comunitate/`.

This is DEV-only. No production DNS or GitHub Pages changes are authorized by this commit. Preview runtime Supabase configuration and end-to-end checks must be validated before any public release.
