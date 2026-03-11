# rtms-videosdk-minimal

A minimal Node.js sample that detects `session.rtms_started` from Zoom Video SDK and records live transcription via RTMS.

---

> ⚠️ The following sample application is a personal, open-source project shared by the app creator and not an officially supported Zoom Communications, Inc. sample application. Zoom Communications, Inc., its employees and affiliates are not responsible for the use and maintenance of this application. Please use this sample application for inspiration, exploration and experimentation at your own risk and enjoyment. You may reach out to the app creator and broader Zoom Developer community on https://devforum.zoom.us/ for technical discussion and assistance, but understand there is no service level agreement support for this application. Thank you and happy coding!

> ⚠️ このサンプルのアプリケーションは、Zoom Communications, Inc.の公式にサポートされているものではなく、アプリ作成者が個人的に公開しているオープンソースプロジェクトです。Zoom Communications, Inc.とその従業員、および関連会社は、本アプリケーションの使用や保守について責任を負いません。このサンプルアプリケーションは、あくまでもインスピレーション、探求、実験のためのものとして、ご自身の責任と楽しみの範囲でご活用ください。技術的な議論やサポートが必要な場合は、アプリ作成者やZoom開発者コミュニティ（ https://devforum.zoom.us/ ）にご連絡いただけますが、このアプリケーションにはサービスレベル契約に基づくサポートがないことをご理解ください。

---

## Overview

```
Video SDK session starts
        │
        ▼
Zoom sends session.rtms_started webhook
        │
        ▼
Express server connects to RTMS via @zoom/rtms SDK
        │
        ▼
Transcripts saved to transcripts/<session_id>.txt
```

Transcripts are saved per session to `transcripts/<session_id>.txt`.

## Prerequisites

- Node.js 20.3.0 or later
- [ngrok](https://ngrok.com/) (for local development)
- A Zoom **Video SDK App** with RTMS enabled
  → [Zoom Marketplace](https://marketplace.zoom.us/) > Develop > Build App > Video SDK

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Where to find it |
|---|---|
| `ZM_RTMS_CLIENT` | Marketplace > Your Video SDK App > App Credentials > SDK Key |
| `ZM_RTMS_SECRET` | Marketplace > Your Video SDK App > App Credentials > SDK Secret |
| `ZOOM_SECRET_TOKEN` | Marketplace > Your App > Features > Event Subscriptions > Secret Token |
| `PORT` | Local port for the webhook server (default: `3000`) |

### 3. Start ngrok

In a separate terminal, expose your local server to the internet:

```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g. `https://xxxx-xx-xx-xxx-xx.ngrok-free.app`).

### 4. Configure the Zoom App webhook

In [Zoom Marketplace](https://marketplace.zoom.us/), open your Video SDK App and go to **Features > Event Subscriptions**:

1. Click **Add Event Subscription**
2. Set the webhook URL to `https://<your-ngrok-url>/webhook`
3. Add the following events:
   - `session.rtms_started`
   - `session.rtms_stopped`
4. Click **Done**, then **Save**

### 5. Start the server

```bash
npm start
```

```
Webhook server listening on http://localhost:3000/webhook
Transcripts will be saved to ./transcripts/
```

## Usage

Start a Zoom Video SDK session. When the session begins, RTMS connects automatically and transcription starts. Transcripts are written to `transcripts/<session_id>.txt` in real time:

```
=== Session: ohfNbXRpQZO89GuBe7QGng== ===
[2026-03-11T07:10:06.398Z] User29: Only to a certain.
[2026-03-11T07:10:11.430Z] User29: No no no certain is.
[2026-03-11T07:11:08.566Z] User29: 日本語の。
```

## Notes

- **Only one RTMS connection is allowed per stream.** The server tracks active connections to prevent duplicates.
- The webhook responds with `200 OK` immediately before processing, as required by Zoom to avoid retry-induced duplicate connections.
- Transcription language is detected automatically. For faster start, set the language explicitly in your Video SDK session settings.

## References

- [Zoom RTMS Documentation](https://developers.zoom.us/docs/rtms/)
- [@zoom/rtms SDK](https://github.com/zoom/rtms)
- [Zoom Developer Forum](https://devforum.zoom.us/)
