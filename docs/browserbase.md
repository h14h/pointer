# Browserbase Browse CLI

This project pins the Browserbase `browse` CLI as a dev dependency so agents and developers use the same CLI version through Bun.

## Setup

Install dependencies:

```bash
bun install
bun run browse:install-browser
```

For Browserbase cloud commands, export your API key in the shell that runs the command:

```bash
export BROWSERBASE_API_KEY="your_api_key"
```

The API key is available from <https://www.browserbase.com/settings>. Do not commit API keys; `.env*` files are ignored in this repo.

## Commands

```bash
bun run browse -- --version
bun run browse:doctor
bun run browse:install-browser
bun run browse:local
bun run browse:projects
bun run browse:sessions
```

Use `bun run browse:local` after `bun dev` is running. It opens the local app in an isolated local browser session.
The script uses the Chromium executable managed by Playwright, so it does not require a system Chrome install once `bun run browse:install-browser` has completed.

Use `bun run browse:projects` to verify `BROWSERBASE_API_KEY` before running remote or cloud workflows.
