#!/usr/bin/env python3
"""Generate the pending city-dialogue corpus with Qwen3-TTS-Flash voice Li."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from nanjinghua_tts import (
	LANGUAGE_TYPE,
	MODEL_ID,
	VOICE_ID,
	VOICE_NAME,
	generate_wav,
	inspect_wav,
)


CORPUS_PATH = Path("docs/research/nanjinghua-tts-corpus.json")
CANDIDATE_ROOT = Path(".tts-candidates/qwen3-tts-flash-li/dialogues")
PUBLIC_AUDIO_DIR = Path("public/audio/nanjinghua-dialogues")


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="Generate and promote all dialogue lines marked not-generated in the TTS corpus."
	)
	parser.add_argument(
		"--promote",
		type=Path,
		metavar="CANDIDATE_DIR",
		help="Validate an existing candidate set, then publish its WAV files.",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Validate the corpus and print the generation plan without API calls.",
	)
	return parser.parse_args()


def load_corpus_tasks() -> tuple[
	int, list[dict[str, str]], list[dict[str, str]], set[str]
]:
	corpus = json.loads(CORPUS_PATH.read_text(encoding="utf-8"))
	schema_version = corpus.get("schemaVersion")
	if not isinstance(schema_version, int):
		raise RuntimeError(f"Corpus has no schema version: {CORPUS_PATH}")

	all_tasks: list[dict[str, str]] = []
	pending_tasks: list[dict[str, str]] = []
	dialogue_audio_ids: set[str] = set()
	for scene in corpus.get("scenes", []):
		for line in scene.get("lines", []):
			task = {
				"id": line.get("id"),
				"slug": scene.get("slug"),
				"scene": scene.get("scene"),
				"speaker": line.get("speaker"),
				"text": line.get("utterance"),
				"meaning": line.get("meaning"),
				"context": line.get("context"),
			}
			if not all(isinstance(value, str) and value for value in task.values()):
				raise RuntimeError(f"Corpus contains an incomplete pending line: {line}")
			if not re.fullmatch(r"[a-z0-9-]+", task["id"]):
				raise RuntimeError(f"Corpus contains an unsafe line ID: {task['id']}")
			all_tasks.append(task)
			if line.get("audioStatus") == "not-generated":
				pending_tasks.append(task)
			audio_src = line.get("audioSrc")
			if isinstance(audio_src, str) and audio_src.startswith(
				"/audio/nanjinghua-dialogues/"
			):
				dialogue_audio_ids.add(task["id"])

	if len(pending_tasks) != corpus.get("totals", {}).get("notGenerated"):
		raise RuntimeError(f"Pending-line total does not match corpus totals: {CORPUS_PATH}")
	return schema_version, all_tasks, pending_tasks, dialogue_audio_ids


def generate_candidate_set(
	api_key: str, candidate_dir: Path, tasks: list[dict[str, str]]
) -> list[dict[str, Any]]:
	candidate_dir.mkdir(parents=True, exist_ok=False)
	entries: list[dict[str, Any]] = []

	for index, task in enumerate(tasks, start=1):
		line_id = task["id"]
		print(f"[{index:02d}/{len(tasks)}] {line_id}: {task['text']}", flush=True)
		destination = candidate_dir / f"{line_id}.wav"
		request_id = generate_wav(api_key, task["text"], destination)
		entries.append({**task, "request_id": request_id, **inspect_wav(destination)})

	return entries


def validate_candidate_set(candidate_dir: Path) -> Path:
	manifest_path = candidate_dir / "manifest.json"
	if not manifest_path.is_file():
		raise RuntimeError(f"Candidate manifest does not exist: {manifest_path}")

	manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
	schema_version, all_tasks, pending_tasks, dialogue_audio_ids = load_corpus_tasks()
	if (
		manifest.get("scope") != "pending-dialogues"
		or manifest.get("corpus_schema_version") != schema_version
		or manifest.get("model") != MODEL_ID
		or manifest.get("voice") != VOICE_ID
		or manifest.get("language_type") != LANGUAGE_TYPE
	):
		raise RuntimeError(f"Candidate manifest uses unexpected generation settings: {manifest_path}")

	entries = manifest.get("entries")
	if not isinstance(entries, list):
		raise RuntimeError(f"Candidate manifest has no entries: {manifest_path}")
	entries_by_id = {entry.get("id"): entry for entry in entries if isinstance(entry, dict)}
	if len(entries_by_id) != len(entries):
		raise RuntimeError(f"Candidate manifest contains duplicate or invalid entries: {manifest_path}")
	corpus_by_id = {task["id"]: task for task in all_tasks}
	expected_ids = {task["id"] for task in pending_tasks} | dialogue_audio_ids
	if set(entries_by_id) != expected_ids:
		raise RuntimeError(f"Candidate manifest is incomplete: {manifest_path}")

	for line_id, entry in entries_by_id.items():
		task = corpus_by_id.get(line_id)
		if not task or any(entry.get(key) != value for key, value in task.items()):
			raise RuntimeError(f"Candidate metadata mismatch for {line_id}: {manifest_path}")
		audio_path = candidate_dir / f"{line_id}.wav"
		if not audio_path.is_file():
			raise RuntimeError(f"Candidate audio does not exist: {audio_path}")
		if inspect_wav(audio_path)["sha256"] != entry.get("sha256"):
			raise RuntimeError(f"Candidate audio hash mismatch: {audio_path}")

	return manifest_path


def promote(candidate_dir: Path, manifest_path: Path) -> Path | None:
	timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
	backup_dir: Path | None = None
	if PUBLIC_AUDIO_DIR.exists():
		backup_dir = CANDIDATE_ROOT / "backups" / timestamp
		shutil.copytree(PUBLIC_AUDIO_DIR, backup_dir)
	PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

	manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
	for entry in manifest["entries"]:
		source = candidate_dir / f"{entry['id']}.wav"
		shutil.copy2(source, PUBLIC_AUDIO_DIR / source.name)
	shutil.copy2(manifest_path, PUBLIC_AUDIO_DIR / "manifest.json")
	return backup_dir


def main() -> None:
	args = parse_args()
	missing_commands = [name for name in ("ffmpeg", "ffprobe") if shutil.which(name) is None]
	if missing_commands:
		raise SystemExit(f"Missing required command(s): {', '.join(missing_commands)}")

	schema_version, _, tasks, _ = load_corpus_tasks()
	if args.dry_run:
		print(
			json.dumps(
				{
					"model": MODEL_ID,
					"voice": VOICE_ID,
					"language_type": LANGUAGE_TYPE,
					"corpus_schema_version": schema_version,
					"candidate_count": len(tasks),
					"promote": str(args.promote) if args.promote else None,
				},
				ensure_ascii=False,
				indent=2,
			)
		)
		return

	if args.promote:
		manifest_path = validate_candidate_set(args.promote)
		backup_dir = promote(args.promote, manifest_path)
		print(f"Promoted to: {PUBLIC_AUDIO_DIR}")
		if backup_dir:
			print(f"Previous dialogue-audio backup: {backup_dir}")
		return

	if not tasks:
		print(f"Corpus has no pending dialogue lines: {CORPUS_PATH}")
		return

	api_key = os.environ.get("DASHSCOPE_API_KEY")
	if not api_key:
		raise SystemExit("DASHSCOPE_API_KEY is required in the current process.")

	run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
	candidate_dir = CANDIDATE_ROOT / "runs" / run_id
	entries = generate_candidate_set(api_key, candidate_dir, tasks)
	manifest = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"scope": "pending-dialogues",
		"corpus_schema_version": schema_version,
		"model": MODEL_ID,
		"voice": VOICE_ID,
		"voice_name": VOICE_NAME,
		"language_type": LANGUAGE_TYPE,
		"entries": entries,
	}
	manifest_path = candidate_dir / "manifest.json"
	manifest_path.write_text(
		json.dumps(manifest, ensure_ascii=False, indent="\t") + "\n",
		encoding="utf-8",
	)
	print(f"Candidate set: {candidate_dir}")
	print(
		"Promote this exact run with:\n"
		f"python3 {Path(__file__)} --promote {candidate_dir}"
	)


if __name__ == "__main__":
	main()
