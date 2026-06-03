---
id: mcp-json
title: .mcp.json
sidebar_position: 2
---

# `.mcp.json` reference

Lives at `plugins/<name>/.mcp.json`. Declares one or more MCP servers.

## Schema

```json
{
  "mcpServers": {
    "<server-id>": {
      "type": "stdio" | "sse" | "http",
      // …transport-specific fields…
    }
  }
}
```

## Per-transport fields

### stdio

| Field | Required | Notes |
|---|---|---|
| `type` | ✅ | `"stdio"` |
| `command` | ✅ | Executable, e.g. `"node"`, `"npx"` |
| `args` | ✅ | string[] of args |
| `env` | as needed | `{ VAR: "${VAR}" }` map |

### sse / http

| Field | Required | Notes |
|---|---|---|
| `type` | ✅ | `"sse"` or `"http"` |
| `url` | ✅ | Full URL to the MCP endpoint |
| `headers` | as needed | `{ "Authorization": "Bearer ${VAR}" }` map |

## Variable substitution

Two flavours of `${…}` placeholders are recognised:

| Placeholder | Source |
|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | Reserved. Expands to the plugin's absolute path on disk. |
| `${ANY_OTHER_VAR}` | Tenant secret store (MyHub) or shell env (Claude Code). **Must be documented in the README's `## Configuration` section** — the validator enforces this. |

## Connection block (connect-modal metadata)

The `${VAR}` placeholders above say *what* a server needs, but not *how a user obtains it*. For static-credential auth (API keys, tokens), declare a **`connection` block in `plugin.json`** so MyHub's Connect modal renders friendly labels and instructions instead of raw variable names:

```jsonc
// .claude-plugin/plugin.json
{
  "name": "cliniko-scheduling",
  "connection": {
    "authType": "api_key",            // "oauth" (default for http/sse) | "api_key" | "none"
    "instructions": "In Cliniko, open **My Info → Manage API keys**, create a key, and paste it below.",
    "docUrl": "https://help.cliniko.com/en/articles/1023957-find-your-api-key",
    "fields": [
      {
        "name": "CLINIKO_API_KEY",     // MUST match a ${VAR} placeholder in this .mcp.json
        "label": "Cliniko API key",
        "type": "password",            // masks input; "text" otherwise
        "required": true,
        "placeholder": "MS0…-au4",
        "helpText": "Ends in a region suffix like -au4."
      }
    ]
  }
}
```

Rules the validator enforces:

- `authType` must be `oauth`, `api_key`, or `none`.
- For `api_key`, `fields` is non-empty; each `name` is UPPER_SNAKE_CASE **and must match a `${VAR}` placeholder** in this plugin's `.mcp.json` `env`/`headers` (otherwise the typed value never reaches the server).
- Each field still needs README `## Configuration` documentation.

`oauth` plugins don't need a `connection` block — `http`/`sse` servers default to the OAuth Connect flow. Use the block when there is no OAuth (a static per-user key) or to give a zero-config server (`none`) a cleaner Connect experience.

## Multiple servers per plugin

Allowed. The Microsoft 365 plugin uses one server per Graph scope:

```json
{
  "mcpServers": {
    "m365-mail":     { "type": "http", "url": "…/m365-email/mcp" },
    "m365-calendar": { "type": "http", "url": "…/m365-calendar/mcp" },
    "m365-files":    { "type": "http", "url": "…/m365-files/mcp" }
  }
}
```

Each server-id is what the widget `dataProvider.mcp` (and the agent's tool-call routing) will reference.
