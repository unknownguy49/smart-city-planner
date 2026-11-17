import subprocess
from fastapi import HTTPException

import os

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(tags=["Speech"])

SARVAM_URL = "https://api.sarvam.ai/speech-to-text"

def convert_audio_to_wav(audio_bytes: bytes) -> bytes:
    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel", "error",
            "-i", "pipe:0",
            "-ac", "1",
            "-ar", "16000",
            "-c:a", "pcm_s16le",
            "-f", "wav",
            "pipe:1",
        ],
        input=audio_bytes,
        capture_output=True,
        check=False,
        timeout=30,
    )

    if result.returncode != 0:
        raise ValueError("Could not convert audio to WAV.")

    return result.stdout

@router.post("/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    api_key = os.getenv("SARVAM_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="SARVAM_API_KEY is missing from the backend environment.",
        )

    audio_bytes = await audio.read()

    try:
        wav_bytes = convert_audio_to_wav(audio_bytes)
    except (ValueError, subprocess.SubprocessError, OSError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Audio conversion failed. Please record again.",
        ) from exc

    if not audio_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded audio file is empty.",
        )

    filename = audio.filename or "recording.webm"
    content_type = audio.content_type or "audio/webm"

    headers = {"api-subscription-key": api_key}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            # First, transcribe in the original language.
            transcription = await client.post(
                SARVAM_URL,
                headers=headers,
                data={
                    "model": "saaras:v4",
                    "mode": "transcribe",
                    "language_code": "unknown",
                },
                files={
                    "file": (filename, audio_bytes, content_type)
                },
            )

            if not transcription.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Sarvam transcription failed: {transcription.text[:500]}",
                )

            result = transcription.json()
            original_text = result.get("transcript", "").strip()
            language = result.get("language_code") or "unknown"

            if not original_text:
                raise HTTPException(
                    status_code=422,
                    detail="No speech was recognized.",
                )

            # If the recording is already English, no translation is needed.
            if language.lower().startswith("en"):
                english_text = original_text
            else:
                translation = await client.post(
                    SARVAM_URL,
                    headers=headers,
                    data={
                        "model": "saaras:v3",
                        "mode": "translate",
                        "language_code": language,
                    },
                    files={
                        "file": (filename, audio_bytes, content_type)
                    },
                )

                if not translation.is_success:
                    raise HTTPException(
                        status_code=502,
                        detail=f"Sarvam translation failed: {translation.text[:500]}",
                    )

                english_text = (
                    translation.json().get("transcript", "").strip()
                )

                if not english_text:
                    raise HTTPException(
                        status_code=502,
                        detail="Could not translate the recording into English.",
                    )

            return {
                "detected_language": language,
                "original_text": original_text,
                "english_text": english_text,
            }

    except HTTPException:
        raise
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not connect to Sarvam: {str(exc)}",
        ) from exc
