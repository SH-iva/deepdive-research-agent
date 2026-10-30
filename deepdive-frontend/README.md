# DeepDive frontend

React 19 + Vite UI for [DeepDive](../README.md). See the root README for architecture and setup.

```bash
cp .env.example .env   # Clerk + Supabase keys
npm install
npm run dev            # dev server on :5173 (API defaults to http://localhost:8000)
npm run lint && npm test && npm run build
```

`VITE_API_URL` overrides the API base URL.
