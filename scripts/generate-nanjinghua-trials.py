#!/usr/bin/env python3
"""Generate Nanjinghua candidates with Qwen3-TTS-Flash voice Li."""

from __future__ import annotations

import argparse
import json
import os
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

CANDIDATE_ROOT = Path(".tts-candidates/qwen3-tts-flash-li")
PUBLIC_AUDIO_DIR = Path("public/audio/nanjinghua-trials")

TRIALS = (
	("jigongjiao", "后头空得很，往里走诶。"),
	("lane", "上哪块去啊？"),
	("shop", "老板，这个怎么卖啊？"),
	("market", "便宜一得儿行啊？"),
	("breakfast", "阿要辣油啊？"),
	("kitchen", "莫搁盐了，够咸了。"),
	("downstairs", "今个蛮凉快的。"),
	("school-gate", "今个作业多不多啊？"),
	("playground", "还差一个，阿有人来？"),
	("new-estate", "电梯等一哈。"),
	("phone-screen", "你到哪块了？"),
	("stage", "开场了，快坐得。"),
	("desk", "这本你看到哪块了？"),
	("festival-street", "人多的一塌。"),
	("station", "票证带了啊？"),
)


def parse_args() -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description=(
			"Generate all 15 trials in an isolated candidate directory. "
			"Use --promote only after listening to the candidates."
		)
	)
	parser.add_argument(
		"--promote",
		type=Path,
		metavar="CANDIDATE_DIR",
		help="Validate an existing candidate set, then back up and replace public WAV files.",
	)
	parser.add_argument(
		"--dry-run",
		action="store_true",
		help="Validate configuration and print the generation plan without API calls.",
	)
	return parser.parse_args()


def generate_candidate_set(api_key: str, candidate_dir: Path) -> list[dict[str, Any]]:
	candidate_dir.mkdir(parents=True, exist_ok=False)
	manifest_entries: list[dict[str, Any]] = []

	for index, (slug, text) in enumerate(TRIALS, start=1):
		print(f"[{index:02d}/{len(TRIALS)}] {slug}: {text}", flush=True)
		destination = candidate_dir / f"{slug}.wav"
		request_id = generate_wav(api_key, text, destination)

		manifest_entries.append(
			{
				"slug": slug,
				"text": text,
				"request_id": request_id,
				**inspect_wav(destination),
			}
		)

	return manifest_entries


def validate_candidate_set(candidate_dir: Path) -> Path:
	manifest_path = candidate_dir / "manifest.json"
	if not manifest_path.is_file():
		raise RuntimeError(f"Candidate manifest does not exist: {manifest_path}")

	manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
	if (
		manifest.get("model") != MODEL_ID
		or manifest.get("voice") != VOICE_ID
		or manifest.get("language_type") != LANGUAGE_TYPE
	):
		raise RuntimeError(f"Candidate manifest uses an unexpected model or voice: {manifest_path}")

	entries = manifest.get("entries")
	if not isinstance(entries, list):
		raise RuntimeError(f"Candidate manifest has no entries: {manifest_path}")
	entries_by_slug = {
		entry.get("slug"): entry for entry in entries if isinstance(entry, dict)
	}
	if len(entries_by_slug) != len(TRIALS):
		raise RuntimeError(f"Candidate manifest is incomplete: {manifest_path}")

	for slug, text in TRIALS:
		entry = entries_by_slug.get(slug)
		if not entry or entry.get("text") != text:
			raise RuntimeError(f"Candidate text mismatch for {slug}: {manifest_path}")
		audio_path = candidate_dir / f"{slug}.wav"
		if not audio_path.is_file():
			raise RuntimeError(f"Candidate audio does not exist: {audio_path}")
		actual = inspect_wav(audio_path)
		if actual["sha256"] != entry.get("sha256"):
			raise RuntimeError(f"Candidate audio hash mismatch: {audio_path}")

	return manifest_path


def promote(candidate_dir: Path, manifest_path: Path) -> Path:
	timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
	backup_dir = CANDIDATE_ROOT / "backups" / timestamp
	backup_dir.mkdir(parents=True, exist_ok=False)
	PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)

	for slug, _ in TRIALS:
		current = PUBLIC_AUDIO_DIR / f"{slug}.wav"
		if current.exists():
			shutil.copy2(current, backup_dir / current.name)

	for slug, _ in TRIALS:
		source = candidate_dir / f"{slug}.wav"
		if not source.exists():
			raise RuntimeError(f"Candidate set is incomplete: missing {source}")
		shutil.copy2(source, PUBLIC_AUDIO_DIR / source.name)

	shutil.copy2(manifest_path, PUBLIC_AUDIO_DIR / "manifest.json")
	return backup_dir


def main() -> None:
	args = parse_args()
	missing_commands = [name for name in ("ffmpeg", "ffprobe") if shutil.which(name) is None]
	if missing_commands:
		raise SystemExit(f"Missing required command(s): {', '.join(missing_commands)}")

	if args.dry_run:
		print(
			json.dumps(
				{
					"model": MODEL_ID,
					"voice": VOICE_ID,
					"language_type": LANGUAGE_TYPE,
					"candidate_count": len(TRIALS),
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
		print(f"Previous audio backup: {backup_dir}")
		return

	api_key = os.environ.get("DASHSCOPE_API_KEY")
	if not api_key:
		raise SystemExit(
			"DASHSCOPE_API_KEY is required. Create a Beijing-region Model Studio "
			"API key and export it in the current shell."
		)

	run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
	candidate_dir = CANDIDATE_ROOT / "runs" / run_id
	entries = generate_candidate_set(api_key, candidate_dir)
	manifest = {
		"generated_at": datetime.now(timezone.utc).isoformat(),
		"model": MODEL_ID,
		"voice": VOICE_ID,
		"voice_name": VOICE_NAME,
		"language_type": LANGUAGE_TYPE,
		"entries": entries,
	}
	manifest_path = candidate_dir / "manifest.json"
	manifest_path.write_text(
		json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
		encoding="utf-8",
	)
	print(f"Candidate set: {candidate_dir}")

	print(
		"Listen to every candidate, then promote this exact run with:\n"
		f"python3 {Path(__file__)} --promote {candidate_dir}"
	)


if __name__ == "__main__":
	main()
