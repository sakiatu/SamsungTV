# Nearby · Samsung TV Remote

A minimal, local-network remote for Samsung Tizen TVs. Open it in a browser on your laptop or phone to control your TV, launch apps, and type in YouTube using navigation-based keyboard input.

The main screen is just the remote. Connection settings, apps, the number pad, and the alphabet keyboard appear when you need them.

## Features

- **Everyday controls:** navigation, OK, Back, Home, Menu, Source, Guide, volume, channels, playback, and power.
- **App shortcuts:** a YouTube button and an app popover with launch commands for the configured apps.
- **YouTube keyboard:** converts characters into directional presses and OK, instead of relying on text injection that YouTube may ignore.
- **Physical keyboard input:** queued typing with a full-text progress preview and a colored active character.
- **Minimal focus syncing:** identify the currently highlighted TV key with one tap; a red tint indicates an unknown selection.
- **Local pairing:** the TV approves the connection, and the server stores the pairing token locally.
- **Home-server deployment:** run independently of your laptop, with an optional Git push deployment hook.

## Requirements and compatibility

- Node.js **22 or later** and npm.
- A Samsung TV with the local Tizen remote WebSocket interface enabled.
- A computer or home server that can reach the TV on the local network.
- A modern browser with support for native HTML popovers.

Developed and tested with a **Samsung UA32N4300**. Other models may behave differently. App IDs, remote keys, and YouTube keyboard layouts are not universal.

The app currently includes a sample TV address (`192.168.0.108`), a model label, and a saved list of apps from the development TV. Set your own TV address in **Samsung → Connection settings**. The app catalog in [`apps.js`](apps.js) is a static list, not live discovery.

## Quick start

```sh
git clone https://github.com/sakiatu/SamsungTV.git
cd SamsungTV
npm ci
npm start
```

Open **[http://127.0.0.1:7000](http://127.0.0.1:7000)**.

1. Turn on the TV and connect it to the same local network as the server.
2. Open the connection settings from the Samsung label and enter the TV's IP address.
3. Choose **Save & connect**. Secure port **8002** is the default; port **8001** is available for compatible models.
4. Select **Allow** on the television when prompted.

Pairing configuration is stored in `.data/config.json`, which is excluded from Git. A server restart preserves the token, but you must click **Connect** again to establish the TV connection.

## Using the remote

| Control | What it opens or does |
| --- | --- |
| Samsung label | Connection status and settings |
| Connect beside Offline | Connect using the saved settings |
| YouTube | Launch YouTube |
| Apps grid | Show the configured app shortcuts |
| Number-pad icon | Expand numeric keys |
| ABC icon | Expand the YouTube keyboard |
| ? | Help and keyboard shortcuts |

### YouTube typing

YouTube on the development TV did not accept Samsung's direct text-input commands. This remote instead navigates the TV's on-screen keyboard and presses OK for each character.

1. Open YouTube Search on the TV, with its alphabet keyboard visible.
2. Expand **ABC** in the remote.
3. Tap or type the key currently highlighted on the TV. **This first input only syncs the position; it does not type.**
4. Tap letters or type on your computer keyboard. Commands are queued and sent sequentially.
5. Use **↻** to sync again if another remote moves the TV selection.

The status shows the queued text with the active character colored blue. The preview disappears when the queue completes. It represents commands entered through this remote, not a readback of the TV's search field.

The navigation algorithm targets this layout:

```text
A B C D E F G   Delete
H I J K L M N   &123
O P Q R S T U   Globe
V W X Y Z - '
Space   Clear   Search
```

Down from any key in the last alphabet row reaches Space. Space, Clear, and Search preserve the originating column when moving back Up. If that column is unknown, the remote sends Up without OK and asks you to identify the highlighted letter.

Delete, Space, and Clear can be repeated. Search and layout-switch commands require syncing again before further typing. The numeric/symbol and alternative-language layouts are **not mapped**; return to the alphabet layout before continuing. Adjust [`keyboard.js`](keyboard.js) if your TV uses different navigation behavior.

### Computer keyboard shortcuts

Keep the remote page focused.

| Key | ABC panel open | ABC panel closed |
| --- | --- | --- |
| A–Z, `-`, `'` | Type through TV keyboard navigation | M toggles mute; other letters have no shortcut |
| Space | Select Space | Play |
| Backspace / Delete | Select Delete | Backspace goes back |
| Enter | Select Search | OK |
| Arrow keys | No direct arrow shortcut | Navigate |
| 0–9 | Not mapped to the alphabet layout | Send number keys |
| + / − | Not mapped to the alphabet layout | Volume up / down |

Browser shortcuts using Ctrl, Command, or Alt are left alone. Physical keyboard input is suspended while settings, help, or the app popover is open.

## Run on a home server

A phone can use this remote without the laptop if the Node server runs on an always-on device on the home network.

For example, if that device has LAN address `192.168.0.103`:

```sh
BIND_HOST=192.168.0.103 ALLOWED_HOSTS=192.168.0.103 PORT=7000 npm start
```

Open **http://192.168.0.103:7000** from a phone on the same network. Replace that address with your server's actual LAN IP. The server bridges the phone's browser requests to the TV; hosting the static page alone is insufficient.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `7000` | HTTP listening port |
| `BIND_HOST` | `127.0.0.1` | Interface/address to listen on |
| `ALLOWED_HOSTS` | Empty | Comma-separated additional hostnames/IPs, without ports |

`localhost` and `127.0.0.1` are always allowed Host names. Additional names must match how clients access the server.

### Keep it running with systemd

The example unit in [`deploy/samsung-tv-remote.service`](deploy/samsung-tv-remote.service) assumes:

- App files at `~/samsung-tv-remote`.
- Node at `/usr/bin/node`.
- Server LAN address `192.168.0.103`, port `7000`.

Edit those values for your machine before installing:

```sh
mkdir -p ~/.config/systemd/user
cp deploy/samsung-tv-remote.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now samsung-tv-remote
loginctl enable-linger "$USER"
```

Lingering lets the user service run after logout and start at boot; enabling it may require administrator assistance.

```sh
systemctl --user status samsung-tv-remote
systemctl --user restart samsung-tv-remote
journalctl --user -u samsung-tv-remote -n 50
```

## Optional push-to-deploy

[`deploy/post-receive`](deploy/post-receive) is a Bash hook for a bare Git repository on a Linux home server. It requires Node, npm, Git, rsync, flock, curl, and the configured user service.

The example assumes a bare repository at `~/repos/samsung-tv-remote.git`, an existing live app at `~/samsung-tv-remote`, and a health endpoint at `http://192.168.0.103:7000/api/status`. Change these paths and the URL if needed.

On the server:

```sh
mkdir -p ~/repos
git init --bare --initial-branch=main ~/repos/samsung-tv-remote.git
cp deploy/post-receive ~/repos/samsung-tv-remote.git/hooks/post-receive
chmod 700 ~/repos/samsung-tv-remote.git/hooks/post-receive
git --git-dir="$HOME/repos/samsung-tv-remote.git" config receive.denyNonFastForwards true
git --git-dir="$HOME/repos/samsung-tv-remote.git" config receive.denyDeletes true
```

On your development computer, replace `YOUR_SSH_HOST` with your server's SSH alias or `user@address`:

```sh
git remote add home YOUR_SSH_HOST:repos/samsung-tv-remote.git
git push home main
```

For pushes to `main`, the hook:

1. Installs dependencies and runs tests in a staging directory.
2. Saves a rollback copy of the current app.
3. Updates the app while preserving `.data` and restarts the service.
4. Checks HTTP health and service state; restores the previous app on failure.

Other branches do not deploy. Git can accept a push even if a post-receive hook fails, so check for the **Deployed** message. The deployed revision and retained build/rollback directories are under `~/.local/share/samsung-tv-remote/releases`. Those directories require occasional manual cleanup.

Changes to the hook or service unit must be installed separately; an ordinary app deployment does not replace the installed infrastructure files.

### Push to GitHub and your home server together

After configuring `origin` for your own GitHub repository, add two push destinations:

```sh
git remote set-url --add --push origin https://github.com/YOUR_ACCOUNT/YOUR_REPO.git
git remote set-url --add --push origin YOUR_SSH_HOST:repos/samsung-tv-remote.git
git config branch.main.pushRemote origin
git push origin main
```

This is local Git configuration and is not inherited by other clones. Fetches still read the normal `origin` URL. The two pushes are not atomic; inspect both results and retry if one fails. Edits made directly on GitHub do not deploy automatically—pull them locally, then push to the home server.

## Security and limitations

- Intended for a **trusted local network**. There is no application login: devices that can reach an allowed LAN address can control the TV.
- Do not forward the HTTP port or TV control ports to the public internet. A cloud host cannot directly reach a private TV address without a network bridge or VPN.
- Requests enforce allowed Host values and matching browser origins; state-changing API requests require JSON. These checks are not user authentication.
- TV destinations must be private IPv4 addresses. IPv6 and hostname-based TV addresses are not supported.
- The TV's self-signed certificate is accepted on its secure WebSocket connection; this does not authenticate the TV certificate.
- Keep `.data/config.json` private. Do not commit pairing tokens or share that directory.
- Power requires an active connection. Wake-on-LAN is not implemented.
- A successful send means a command was transmitted, not that the TV confirmed the action.
- Keyboard focus is estimated, not read from the TV. Missed commands or use of another remote require syncing again. Use one controller at a time while typing.
- App presence, service availability, and launch behavior vary by TV. YouTube launch was verified on the development TV; not every catalog entry has been individually tested.

## Development

```sh
npm ci
npm test
npm start
```

The tests cover private-address validation, remote message serialization, WebSocket pairing and key delivery, app launch routing, YouTube keyboard paths, focus recovery, and physical-key mapping. They use a local WebSocket test listener on port 8001; they do not require a real TV or prove behavior on every model.

| File | Responsibility |
| --- | --- |
| `server.js` | HTTP server, local configuration, API routes |
| `remote.js` | Samsung WebSocket pairing and commands |
| `keyboard.js` | YouTube keyboard navigation and recovery |
| `apps.js` | Configured app IDs and launch types |
| `public/` | Remote interface, input queue, styling |
| `test/` | Node test suite |
| `deploy/` | Optional Linux service and Git deployment hook |

For compatibility reports, include the TV model, app keyboard layout, and reproduction steps. Omit pairing tokens, serial numbers, and other private identifiers.

## Acknowledgments

Samsung protocol implementation references: [samsung-tv-ws-api](https://github.com/xchwarze/samsung-tv-ws-api), including its [commands](https://github.com/xchwarze/samsung-tv-ws-api/blob/master/COMMANDS.md) and [application IDs](https://github.com/xchwarze/samsung-tv-ws-api/blob/master/APPLICATIONS.md).

This is an independent project, not affiliated with Samsung or YouTube. No license has been added yet; making a repository public does not itself grant an open-source license.
