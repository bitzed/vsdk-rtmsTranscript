/**
 * RTMS + Zoom Video SDK - Minimal transcription sample
 *
 * 1. Zoom Video SDK session が開始されると session.rtms_started webhook が届く
 * 2. @zoom/rtms SDK で RTMS に接続し、トランスクリプトを受信する
 * 3. トランスクリプトをセッションごとにファイルへ保存する
 *
 * 必要な環境変数 (.env):
 *   ZM_RTMS_CLIENT  - Video SDK App の SDK Key
 *   ZM_RTMS_SECRET  - Video SDK App の SDK Secret
 *   ZOOM_SECRET_TOKEN - Webhook Secret Token (URL 検証に使用)
 *   PORT            - サーバーポート (省略時: 3000)
 */

import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import rtms from "@zoom/rtms";

const PORT = process.env.PORT || 3000;
const TRANSCRIPT_DIR = "transcripts";

// トランスクリプト保存ディレクトリを作成
if (!fs.existsSync(TRANSCRIPT_DIR)) {
  fs.mkdirSync(TRANSCRIPT_DIR);
}

// アクティブなRTMSクライアントを追跡 (重複接続防止)
// key: rtms_stream_id, value: rtms.Client
const activeClients = new Map();

// -------------------------
// Webhook ハンドラー
// -------------------------

const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  const { event, payload } = req.body;

  // Zoom webhook URL 検証チャレンジへの応答
  if (event === "endpoint.url_validation") {
    const hash = crypto
      .createHmac("sha256", process.env.ZOOM_SECRET_TOKEN)
      .update(payload.plainToken)
      .digest("hex");
    return res.json({ plainToken: payload.plainToken, encryptedToken: hash });
  }

  // 重要: 先に 200 を返してから非同期処理する
  // (応答が遅れると Zoom がリトライし、重複接続が発生する)
  res.status(200).send();

  console.log(`[Webhook] event=${event}`);

  if (event === "session.rtms_started") {
    handleRtmsStarted(payload);
  } else if (event === "session.rtms_stopped") {
    handleRtmsStopped(payload);
  }
});

// -------------------------
// RTMS 開始処理
// -------------------------

function handleRtmsStarted(object) {
  const { session_id, rtms_stream_id } = object;

  // 既に接続済みなら何もしない
  if (activeClients.has(rtms_stream_id)) {
    console.log(`[RTMS] Already connected: stream=${rtms_stream_id}`);
    return;
  }

  console.log(`[RTMS] session.rtms_started: session=${session_id}`);

  const client = new rtms.Client();
  activeClients.set(rtms_stream_id, client);

  // トランスクリプトファイル (sessions/<session_id>.txt)
  const transcriptFile = path.join(
    TRANSCRIPT_DIR,
    `${session_id.replace(/[^a-zA-Z0-9_-]/g, "_")}.txt`
  );
  const fileStream = fs.createWriteStream(transcriptFile, { flags: "a" });
  fileStream.write(`=== Session: ${session_id} ===\n`);

  // RTMS 接続確認
  client.onJoinConfirm((reason) => {
    console.log(`[RTMS] Joined (reason=${reason}): session=${session_id}`);
  });

  // トランスクリプト受信
  // timestamp はセッション開始からの相対時間(ms)のため、受信時の実時刻を使う
  client.onTranscriptData((buffer, _size, _timestamp, metadata) => {
    const text = buffer.toString("utf8").trim();
    if (!text) return;

    const ts = new Date().toISOString();
    const line = `[${ts}] ${metadata.userName}: ${text}`;
    console.log(line);
    fileStream.write(line + "\n");
  });

  // 参加者イベント (join / leave)
  client.onParticipantEvent((eventType, _timestamp, participants) => {
    participants.forEach((p) => {
      console.log(`[RTMS] Participant ${eventType}: ${p.userName}`);
    });
  });

  // セッション終了
  client.onLeave((reason) => {
    console.log(`[RTMS] Left (reason=${reason}): session=${session_id}`);
    fileStream.end();
    activeClients.delete(rtms_stream_id);
  });

  // RTMS に接続 (session_id を持つ payload をそのまま渡す)
  client.join(object);
}

// -------------------------
// RTMS 停止処理
// -------------------------

function handleRtmsStopped(object) {
  const { session_id, rtms_stream_id } = object;
  console.log(`[RTMS] session.rtms_stopped: session=${session_id}`);

  const client = activeClients.get(rtms_stream_id);
  if (client) {
    client.leave();
    activeClients.delete(rtms_stream_id);
  }
}

// -------------------------
// サーバー起動
// -------------------------

app.listen(PORT, () => {
  console.log(`Webhook server listening on http://localhost:${PORT}/webhook`);
  console.log(`Transcripts will be saved to ./${TRANSCRIPT_DIR}/`);
});
