
const SPEECH_API_URL =
  process.env.NEXT_PUBLIC_SPEECH_API_URL ||
  "http://127.0.0.1:8000";

export interface SpeechToTextResult {
  detected_language: string;
  original_text: string;
  english_text: string;
}

export async function transcribeAudio(
  audio: Blob
): Promise<SpeechToTextResult> {
  const formData = new FormData();
  formData.append("audio", audio, "recording.webm");

  let response: Response;

  try {
    response = await fetch(
      `${SPEECH_API_URL}/speech-to-text`,
      {
        method: "POST",
        body: formData,
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to the speech service. Check that the FastAPI server is running."
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        `Speech transcription failed (${response.status}).`
    );
  }

  if (
    typeof data?.english_text !== "string" ||
    !data.english_text.trim()
  ) {
    throw new Error(
      "No speech was recognized. Please try again."
    );
  }

  return data as SpeechToTextResult;
}
