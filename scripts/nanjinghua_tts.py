"""Shared Qwen3-TTS-Flash generation and WAV validation helpers."""

from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


MODEL_ID = "qwen3-tts-flash"
VOICE_ID = "Li"
VOICE_NAME = "南京-老李"
LANGUAGE_TYPE = "Chinese"
API_ENDPOINT = (
	"https://dashscope.aliyuncs.com/api/v1/services/"
	"aigc/multimodal-generation/generation"
)


def call_tts(api_key: str, text: str) -> tuple[str, str | None]:
	payload = json.dumps(
		{
			"model": MODEL_ID,
			"input": {
				"text": text,
				"voice": VOICE_ID,
				"language_type": LANGUAGE_TYPE,
			},
		},
		ensure_ascii=False,
	).encode("utf-8")
	request = urllib.request.Request(
		API_ENDPOINT,
		data=payload,
		headers={
			"Authorization": f"Bearer {api_key}",
			"Content-Type": "application/json",
		},
		method="POST",
	)

	try:
		with urllib.request.urlopen(request, timeout=120) as response:
			result = json.load(response)
	except urllib.error.HTTPError as error:
		detail = error.read().decode("utf-8", errors="replace")
		raise RuntimeError(f"Qwen TTS request failed ({error.code}): {detail}") from error

	audio_url = result.get("output", {}).get("audio", {}).get("url")
	if not isinstance(audio_url, str) or not audio_url:
		raise RuntimeError(f"Qwen TTS response did not contain an audio URL: {result}")

	request_id = result.get("request_id")
	return audio_url, request_id if isinstance(request_id, str) else None


def download_audio(audio_url: str, destination: Path) -> None:
	request = urllib.request.Request(audio_url, headers={"User-Agent": "nanjinghua.com/tts"})
	with urllib.request.urlopen(request, timeout=120) as response:
		destination.write_bytes(response.read())


def normalize_wav(source: Path, destination: Path) -> None:
	command = [
		"ffmpeg",
		"-hide_banner",
		"-loglevel",
		"error",
		"-y",
		"-i",
		str(source),
		"-ac",
		"1",
		"-ar",
		"24000",
		"-c:a",
		"pcm_s16le",
		str(destination),
	]
	subprocess.run(command, check=True)


def generate_wav(api_key: str, text: str, destination: Path) -> str | None:
	audio_url, request_id = call_tts(api_key, text)
	with tempfile.TemporaryDirectory(prefix="nanjinghua-tts-") as temp_dir:
		source = Path(temp_dir) / "source-audio"
		download_audio(audio_url, source)
		normalize_wav(source, destination)
	return request_id


def inspect_wav(path: Path) -> dict[str, Any]:
	command = [
		"ffprobe",
		"-v",
		"error",
		"-select_streams",
		"a:0",
		"-show_entries",
		"stream=codec_name,sample_rate,channels:format=duration,size",
		"-of",
		"json",
		str(path),
	]
	result = subprocess.run(command, check=True, capture_output=True, text=True)
	probe = json.loads(result.stdout)
	stream = probe["streams"][0]
	format_data = probe["format"]
	if (
		stream.get("codec_name") != "pcm_s16le"
		or stream.get("sample_rate") != "24000"
		or stream.get("channels") != 1
	):
		raise RuntimeError(f"Unexpected WAV format for {path}: {probe}")

	return {
		"duration_seconds": round(float(format_data["duration"]), 3),
		"size_bytes": int(format_data["size"]),
		"sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
	}
