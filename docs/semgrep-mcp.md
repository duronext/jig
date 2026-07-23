# Semgrep MCP (opt-in static analysis)

Jig's `security` review specialist uses **Semgrep MCP** as its primary
detection engine when the tools are connected, and falls back to manual review
when they are not (see `core/specialists/security.md`). Connecting Semgrep is
optional: reviews are never blocked by a missing connection.

## Connecting a Semgrep MCP server

Semgrep publishes an official MCP server: **https://github.com/semgrep/mcp**.
You can run it locally (stdio or a container) or point at a server your
organization hosts. Register it with Claude Code:

```bash
# Local (stdio) — runs Semgrep on your machine:
claude mcp add semgrep -- uvx semgrep-mcp

# Remote (HTTP) — a Semgrep MCP server your org hosts:
claude mcp add semgrep --transport http https://<your-semgrep-mcp-host>/mcp
```

Add `-s user` to make it available in every project rather than just the
current one. If the server requires authentication, pass a token via
`--header "Authorization: Bearer <token>"`.

Once connected, `semgrep` (dispatched in `code` mode by `review`) runs Semgrep
over the changed files, triages findings against the diff, then applies its
manual checklist for what rules miss.

## Notes

- **Connection is per-developer and opt-in.** Each developer connects their own
  server, so scans run under their own environment and credentials.
- **Hosting a shared server?** Put it behind authentication and restrict access
  to your organization — an open Semgrep MCP endpoint lets anyone submit code
  to scan. Prefer short-lived, per-user credentials over shared static tokens.
- With Semgrep absent, the specialist notes
  `Semgrep MCP: unavailable — manual review only` and continues.
