export type TranscriptionInput = {
  filePath: string;
  mimeType: string;
};

export type TranscriptionResult = {
  text: string;
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
}

