# P2P Match — Flutter Client Guide

NestJS Socket.IO gateway at namespace `/match`. Server pairs two users (Omegle-style) and **opaquely relays** WebRTC SDP/ICE between them.

## Packages

```yaml
socket_io_client: ^3.0.0
flutter_webrtc: ^0.11.0
```

## Connect

JWT access token goes in the handshake.

```dart
final socket = IO.io(
  'https://YOUR_HOST/match',
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': accessToken})
      .build(),
);
```

## How matching works

Server holds a set of **sessions**, each with 1 or 2 peers:

- A session with **1 peer** is *waiting*.
- A session with **2 peers** is *active* — conversation starts.

When you `search`:

1. If a *waiting* session exists (someone else is waiting) → you join it. It becomes *active*. Both sides receive `matched`.
2. Otherwise → a new *waiting* session is created with you as the only peer. You receive `searching`.

You'll always be in at most one session.

## Events

**Client → server**

| Event    | Payload              | Meaning                                                            |
| -------- | -------------------- | ------------------------------------------------------------------ |
| `search` | —                    | Join a waiting session, or create one if none exists.              |
| `cancel` | —                    | Drop your waiting session (no-op if conversation already started). |
| `signal` | `{ data: <opaque> }` | Relay SDP/ICE to partner. Server forwards as-is.                   |
| `leave`  | —                    | End the active session, notify partner.                            |

**Server → client**

| Event          | Payload                                     |
| -------------- | ------------------------------------------- |
| `searching`    | —                                           |
| `matched`      | `{ sessionId, role: 'caller' \| 'callee' }` |
| `signal`       | `{ data }`                                  |
| `partner-left` | `{ reason: 'leave' \| 'disconnect' }`       |
| `cancelled`    | —                                           |
| `left`         | —                                           |
| `replaced`     | —                                           |
| `unauthorized` | `{ message }`                               |
| `error`        | `{ message }`                               |

## Signal payload shapes (client convention)

```jsonc
{ "type": "offer",     "sdp": "..." }
{ "type": "answer",    "sdp": "..." }
{ "type": "candidate", "candidate": { "candidate": "...", "sdpMid": "0", "sdpMLineIndex": 0 } }
```

## Flow

1. `emit('search')` → wait for `matched`.
2. On `matched`, both sides build `RTCPeerConnection` and add local tracks.
3. **`role: 'caller'`** creates the offer → `emit('signal', { data: { type: 'offer', sdp } })`.
   **`role: 'callee'`** waits, then on the offer creates an answer and sends it back.
4. Each `onIceCandidate` → `emit('signal', { data: { type: 'candidate', candidate } })`.
5. `emit('leave')` or close the socket to end the call.

```text
idle ─search→ waiting ─peer joins→ active (matched) ─ICE done→ connected ─leave/disconnect→ idle
```

## ICE servers

```dart
{'iceServers': [
  {'urls': 'stun:stun.l.google.com:19302'},
  // {'urls': 'turn:HOST:3478', 'username': '...', 'credential': '...'}
]}
```

STUN-only often fails on mobile carriers — deploy a TURN server (e.g. coturn) before launch.

## Gotchas

- **Caller is the newcomer.** Whoever joined the *waiting* session (i.e. searched second) gets `role: 'caller'` and must send the offer first. The original peer is `callee`.
- **`search` is idempotent while waiting.** Calling it again before you're matched does nothing; you just get another `searching`.
- **`search` while in an active session** silently ends it — your old partner gets `partner-left`.
- **One socket per user.** A second connection from the same account kicks the first (`replaced`).
- **No renegotiation helpers.** Send a new `offer` in-band if you change tracks (screen share, mute, etc.).
- **Token verified once** at handshake. Refresh and reconnect if it expires.
- **State is in-process memory.** Server restart drops all sessions; doesn't shard across instances yet.
