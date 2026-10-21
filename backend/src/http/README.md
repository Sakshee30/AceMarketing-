# HTTP boundary

The HTTP server is composed in `../index.mjs`, while domain-specific request handling lives under `routes/`.

Each route module follows the same contract:

```js
const handled = await handleDomainRoutes({
  req,
  res,
  url,
  workspaceId,
  readBody,
  send
})
```

Route handlers return `true` after writing a response and `false` when the path does not belong to the module. This keeps the transport concerns in one place while allowing domain routes to depend on their own application services.

Current route modules:

- `routes/mcp-routes.mjs` — MCP access, token, policy, activity, and diagnostics APIs
- `routes/workflow-routes.mjs` — workflow authoring, execution, and approval APIs

New domains should be extracted using this boundary before adding more branches to `index.mjs`.
