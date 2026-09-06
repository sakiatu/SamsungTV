# Nearby — Samsung local remote

A local web remote for the Samsung UA32N4300 at 192.168.0.108. Includes navigation, volume, channels, source, guide, playback, a number pad and a one-tap YouTube launcher. The app never displays invented TV playback or volume state.

## Run

Requires Node.js 22 or later.

```sh
npm install
npm start
```

Open http://localhost:3000 on this computer. Turn the TV on, use the same local network, click **Connect to TV**, and select **Allow** on the television. Pairing tokens are stored locally in `.data/config.json` (excluded from git). Settings let you change the IP and try port 8001 if secure port 8002 is unavailable.

The server intentionally listens on this computer only. It bridges browser requests to the TV's Samsung WebSocket interface; the TV's self-signed TLS certificate is accepted only for that connection. API requests require same-origin JSON and a private IPv4 destination. No account or cloud service is involved.

The power button sends a power key over an active connection. Waking a fully powered-off TV is not implemented. Some keys depend on the TV model and active application. A successful send means the command was transmitted, not that the TV confirmed its action.

Run `npm test` for protocol, destination validation and disconnected-command checks.

Protocol reference: https://github.com/xchwarze/samsung-tv-ws-api

For YouTube text entry, use the directional pad and OK to select letters on the television's on-screen keyboard. Direct text entry is not supported by this remote.
