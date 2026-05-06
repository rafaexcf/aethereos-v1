# Sprint 34 — Auditoria MX192-MX194

> Sprint 34 originalmente listou Weather, Câmera e Gravador como apps
> placeholder a serem tornados funcionais. Análise revelou que **os 3
> já estão funcionais com persistência real** desde sprints anteriores.

Data: 2026-05-06.

---

## MX192 — Weather

**Status: já implementado.**

`apps/weather/WeatherApp.tsx` (1961 linhas) usa:

- **API real:** `api.open-meteo.com/v1/forecast` (free, sem API key, sem cota
  apertada — escolha melhor que wttr.in suggested no sprint).
- **Geolocation:** `navigator.geolocation.getCurrentPosition()` + permission
  query API.
- **Reverse geocoding:** `nominatim.openstreetmap.org/reverse` para
  resolver coordenadas em cidade/estado.
- **Dados:** temperatura, umidade, sensação térmica, vento, pressão,
  índice UV, visibilidade, hourly + daily 10 dias.
- **Fallback:** input manual de cidade quando geolocation negada.
- **Estados:** idle / requesting / loading / ok / denied / unavailable / error.

Critério MX192 atendido — sem mock, dados reais.

---

## MX193 — Câmera

**Status: já implementado.**

`apps/camera/index.tsx` (2746 linhas) usa:

- **getUserMedia:** `{ video: true, audio: false }` + facingMode flip
  (frontal/traseira).
- **Captura:** `canvas.drawImage(video, 0, 0)` + `canvas.toBlob('image/jpeg', 0.9)`.
- **Gravação de vídeo:** MediaRecorder (não só fotos).
- **Storage:** bucket `kernel-media` (privado, RLS por company_id).
- **Persistência metadata:** tabela dedicada (não kernel.files genérico).
- **Cleanup:** stream.getTracks().forEach(t => t.stop()) ao desmontar.
- **Erros:** "Camera not allowed", "No camera detected" com mensagens claras.

Critério MX193 atendido.

---

## MX194 — Gravador de voz

**Status: já implementado.**

`apps/gravador-de-voz/index.tsx` (1961 linhas) usa:

- **getUserMedia:** `{ audio: true, video: false }`.
- **MediaRecorder:** detecta mime suportado (webm/opus, mp4/aac).
- **Estados:** idle / recording / paused / stopped + timer.
- **VU meter:** AnalyserNode + canvas para nível em tempo real.
- **Playback:** `<audio>` controle nativo após parar.
- **Storage:** bucket `kernel-voice` + tabela `voice_recordings`.
- **Lista de gravações:** browse + delete + download.
- **Cleanup:** stream + recorder + AudioContext fechados ao desmontar.
- **Erros:** sem microfone, permissão negada, formato não suportado.

Critério MX194 atendido.

---

## Conclusão MX192-MX194

Sem código novo necessário. Apps já são funcionais e persistem em buckets
dedicados (`kernel-media`, `kernel-voice`) com RLS por company_id.

Próximo: **MX195 (PDF Embedding)** — único trabalho real do Sprint 34.
