# GitHub

Surface **GitHub issues** and **feature roadmaps** (GitHub Projects) on your dashboard, backed by GitHub's official hosted MCP server.

This plugin points at the **read-only** endpoint — `https://api.githubcopilot.com/mcp/readonly` — so it can list and read issues and Projects but never create, edit, or close anything. That keeps the surface area minimal for what is, by design, a reporting plugin. If you later want write access, switch the URL in `.mcp.json` to `https://api.githubcopilot.com/mcp/` and grant your token the matching scopes.

The server acts on your behalf using a personal access token, so it only ever sees repositories and Projects your own GitHub account can access.

## Widgets

| Widget | Tool | What it shows |
|--------|------|----------------|
| **GitHub Issues** | `list_issues` | Open issues for a repository — title, labels, author, comment count, and state. Click through to GitHub. |
| **Feature Roadmap** | `projects_list` (`method: list_projects`) | An org or user's GitHub Projects as roadmaps — title, summary, status (open/closed), and visibility. Open projects first. |

Both widgets ship with example defaults (`owner: mySMB-AI-Studio`, `repo: mysmb-marketplace`, `owner_type: org`). Edit the widget's data-provider parameters to point at your own repository / owner.

## Configuration

Connect with a GitHub personal access token. A **fine-grained** token scoped to the repositories you care about is recommended; a classic token works too.

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_PAT` | Yes | GitHub personal access token. Create it under **Settings → Developer settings → Personal access tokens**. Fine-grained: grant **Issues → Read-only** and **Projects → Read-only** on the target repositories. Classic: the `repo` and `read:project` scopes. Sent as `Authorization: Bearer <token>`. |

> Prefer OAuth? GitHub's remote server also supports browser OAuth — drop the `Authorization` header from `.mcp.json` and let your MCP host handle the OAuth flow. The PAT path above is the self-contained default that needs no extra host configuration.

## Tools used by this plugin

The hosted server exposes many toolsets; this plugin's widgets only call two read tools:

- **`list_issues`** — `owner`, `repo`, `state`, `labels`, `orderBy`, `direction`, `perPage`, `after`, `since`.
- **`projects_list`** — a multiplexed tool keyed by `method`. The roadmap widget uses `method: "list_projects"` with `owner`, `owner_type`, and `per_page`.

## Destructive operations

None. This plugin uses the read-only endpoint and ships no write actions.

## See also

- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Remote GitHub MCP Server docs](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)
- [Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [About GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
