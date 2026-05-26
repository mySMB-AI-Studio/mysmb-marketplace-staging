# GitHub

Surface **GitHub issues** and **feature roadmaps** (GitHub Projects) on your dashboard, backed by GitHub's official hosted MCP server.

This plugin points at the **read-only** endpoint — `https://api.githubcopilot.com/mcp/readonly` — so it can list and read issues and Projects but never create, edit, or close anything. That keeps the surface area minimal for what is, by design, a reporting plugin. If you later want write access, switch the URL in `.mcp.json` to `https://api.githubcopilot.com/mcp/`.

Authentication is **browser OAuth**: each user signs in to GitHub and the server only ever sees repositories and Projects that user can already access.

## Widgets

| Widget | Tool | What it shows |
|--------|------|----------------|
| **GitHub Issues** | `list_issues` | Open issues for a repository — title, labels, author, comment count, and state. Click through to GitHub. |
| **Feature Roadmap** | `projects_list` (`method: list_projects`) | An org or user's GitHub Projects as roadmaps — title, summary, status (open/closed), and visibility. Open projects first. |

Both widgets ship with example defaults (`owner: mySMB-AI-Studio`, `repo: mysmb-marketplace`, `owner_type: org`). Edit the widget's data-provider parameters to point at your own repository / owner.

## Configuration

There are no per-user secrets to enter — users connect through GitHub's OAuth flow. However, **GitHub's OAuth server does not support dynamic client registration**, so an administrator must pre-register an OAuth client once and configure it in myHub before anyone can connect. Without this you will see: *"Dynamic client registration failed … This server may require a pre-registered OAuth app."*

### One-time admin setup on GitHub

1. Create a **GitHub OAuth App** (*Settings → Developer settings → OAuth Apps → New OAuth App*) or, for least-privilege per-repo access, a **GitHub App**.
2. Set the **Authorization callback URL** to myHub's OAuth redirect URI for this connection (copy the exact value from myHub's connection/connector setup screen).
3. Generate a **Client Secret** and note the **Client ID**.
4. The OAuth endpoints are GitHub's standard ones:
   - Authorization: `https://github.com/login/oauth/authorize`
   - Token: `https://github.com/login/oauth/access_token`
5. Suggested scopes for read-only issues + Projects: `read:project`, `read:org`, and `repo` (or `public_repo` if you only need public repositories).

### Configure in myHub

Register the **Client ID** and **Client Secret** from step 3 as the pre-registered OAuth client for the `github` connection (a myHub deployment secret — **do not commit these to this repo**). This tells myHub to use the static client instead of attempting dynamic registration.

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
