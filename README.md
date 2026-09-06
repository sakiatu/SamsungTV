# Nearby — Samsung local remote

A local web remote for the Samsung UA32N4300 at 192.168.0.108. Includes navigation, volume, channels, source, guide, playback, a number pad and a one-tap YouTube launcher. The app never displays invented TV playback or volume state.

## Run

Requires Node.js 22 or later.

```sh
npm install
npm start
```

Open http://localhost:7000 on this computer. Turn the TV on, use the same local network, click **Connect to TV**, and select **Allow** on the television. Pairing tokens are stored locally in `.data/config.json` (excluded from git). Settings let you change the IP and try port 8001 if secure port 8002 is unavailable.

The server intentionally listens on this computer only. It bridges browser requests to the TV's Samsung WebSocket interface; the TV's self-signed TLS certificate is accepted only for that connection. API requests require same-origin JSON and a private IPv4 destination. No account or cloud service is involved.

The power button sends a power key over an active connection. Waking a fully powered-off TV is not implemented. Some keys depend on the TV model and active application. A successful send means the command was transmitted, not that the TV confirmed its action.

Run `npm test` for protocol, destination validation and disconnected-command checks.

Protocol reference: https://github.com/xchwarze/samsung-tv-ws-api

For YouTube text entry, use the directional pad and OK to select letters on the television's on-screen keyboard. Direct text entry is not supported by this remote.

## Home server

The home server deployment uses `~/samsung-tv-remote` on `ssh cloud` (192.168.0.103). Open http://192.168.0.103:7000 from a phone on the home network. No laptop is required.

The user systemd unit is in `deploy/samsung-tv-remote.service`. It binds to the LAN address explicitly and allows that Host header while preserving same-origin request checks. Default local runs still bind to 127.0.0.1. Devices able to reach the LAN port can control the TV; this is intended for the trusted home network.

Service commands on the server:

```sh
systemctl --user status samsung-tv-remote
systemctl --user restart samsung-tv-remote
journalctl --user -u samsung-tv-remote -n 50
```

User lingering must be enabled for startup at boot and operation after SSH logout. Pairing tokens remain in the server's private `.data` directory.

## Push to deploy

The `home` Git remote points to the bare repository at `cloud:repos/samsung-tv-remote.git`. From this project:

```sh
git add <changed-files>
git commit -m "Describe the change"
git push home main
```

Pushing `main` runs the server's post-receive hook: it installs dependencies and runs tests in a staging directory, then updates the live app and restarts the service. `.data` stays on the server and is never replaced. A restart or health-check failure restores the previous app. Other branches do not deploy. No GitHub account or external CI is needed.

Read the push output for `Deployed ...`: Git can accept a push even when its post-receive deployment fails. The last successfully deployed commit is recorded in `~/.local/share/samsung-tv-remote/releases/deployed-revision`. Build and rollback directories remain there for troubleshooting.

The installed hook is `~/repos/samsung-tv-remote.git/hooks/post-receive`; its source is `deploy/post-receive`. Changes to that hook or the systemd unit must be installed separately; ordinary app pushes do not alter deployment infrastructure.

## GitHub and home-server pushes

The private GitHub repository is `https://github.com/sakiatu/SamsungTV` (`origin`). On this laptop, `origin` has two push URLs: GitHub first, then `cloud:repos/samsung-tv-remote.git`. Plain `git push` on `main` sends the commit to both; the home-server push triggers deployment. `home` remains available for server-only pushes. Fetches from `origin` read GitHub.

This multi-destination push configuration is local Git configuration, not part of a clone. To set it up on another trusted computer with the `cloud` SSH alias:

```sh
git remote set-url --add --push origin https://github.com/sakiatu/SamsungTV.git
git remote set-url --add --push origin cloud:repos/samsung-tv-remote.git
git config branch.main.pushRemote origin
```

Pushes to two servers are not atomic. Inspect both results; if one fails, rerun `git push` after restoring access. GitHub-only edits do not automatically deploy to the LAN server; pull them locally and push both destinations.
