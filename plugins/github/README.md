# GitHub

Surface **GitHub issues** and **feature roadmaps** (GitHub Projects) on your dashboard, backed by GitHub's official hosted MCP server.

This plugin points at the **read-only** endpoint — `https://api.githubcopilot.com/mcp/readonly` — so it can list and read issues and Projects but never create, edit, or close anything. That keeps the surface area minimal for what is, by design, a reporting plugin. If you later want write access, switch the URL in `.mcp.json` to `https://api.githubcopilot.com/mcp/`.

Authentication is **browser OAuth with a bring-your-own client** (`oauth_client`): each user pastes a GitHub OAuth app's Client ID + Secret into the Connect dialog, then signs in to GitHub. The server only ever sees repositories and Projects that user can already access.

## Widgets

| Widget | Tool | What it shows |
|--------|------|----------------|
| **GitHub Issues** | `list_issues` | Open issues for a repository — title, labels, author, comment count, and state. Click through to GitHub. |
| **Feature Roadmap** | `projects_list` (`method: list_projects`) | An org or user's GitHub Projects as roadmaps — title, summary, status (open/closed), and visibility. Open projects first. |

Both widgets ship with example defaults (`owner: mySMB-AI-Studio`, `repo: mysmb-marketplace`, `owner_type: org`). Edit the widget's data-provider parameters to point at your own repository / owner.

## Configuration

**GitHub's OAuth server does not support dynamic client registration**, so myHub can't auto-create an OAuth client the way it does for most remote MCP servers. Instead this plugin uses the `oauth_client` connection type: you register a GitHub OAuth app once and paste its credentials into the Connect dialog. Without this you would otherwise see *"Dynamic client registration failed … This server may require a pre-registered OAuth app."*

The Connect dialog collects two fields:

| Field | `name` | Where to get it |
|-------|--------|-----------------|
| **Client ID** | `OAUTH_CLIENT_ID` | Your GitHub OAuth app's settings page. |
| **Client Secret** | `OAUTH_CLIENT_SECRET` | Generate under your OAuth app → *Client secrets*. |

Both are stored encrypted in the **per-user** credentials vault — they are never committed to this repo and never shared between users.

### One-time setup on GitHub

1. Create a **GitHub OAuth App** (*Settings → Developer settings → OAuth Apps → New OAuth App*) or, for least-privilege per-repo access, a **GitHub App**. A single app can be shared across your team (paste the same `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`), or each user can register their own.
2. Set the **Authorization callback URL** to the exact value shown at the top of the Connect dialog (it ends in `/api/user/connections/oauth/callback`). A mismatch here causes `redirect_uri_mismatch`.
3. Generate a **Client Secret** and note the **Client ID** — paste both into the Connect dialog.
4. The OAuth endpoints are GitHub's standard ones, discovered automatically:
   - Authorization: `https://github.com/login/oauth/authorize`
   - Token: `https://github.com/login/oauth/access_token`
5. This plugin requests the least-privilege read scopes `public_repo`, `read:org`, and `read:project` (declared in `plugin.json`) — enough to read public-repo issues and Projects, matching the read-only endpoint. To also read **private** repositories you must widen `public_repo` to `repo` in `plugin.json` (GitHub's classic OAuth scopes have no read-only-private variant — `repo` is read/write at the token level, though this plugin's endpoint still only ever reads).

> **Note on secrets:** a GitHub OAuth app's Client Secret is an *app-level* secret. If your whole team shares one app, prefer having an administrator distribute the Client ID/Secret rather than each user generating their own, so the secret isn't spread further than necessary. Either way myHub stores whatever is entered only in that user's own vault.

## Tools used by this plugin

The hosted server exposes many toolsets; this plugin's widgets only call two read tools:

- **`list_issues`** — `owner`, `repo`, `state`, `labels`, `orderBy`, `direction`, `perPage`, `after`, `since`.
- **`projects_list`** — a multiplexed tool keyed by `method`. The roadmap widget uses `method: "list_projects"` with `owner`, `owner_type`, and `per_page`.

## Destructive operations

None. This plugin uses the read-only endpoint and ships no write actions.

## See also

- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Remote GitHub MCP Server docs](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)
- [Creating a GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app)
- [About GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
