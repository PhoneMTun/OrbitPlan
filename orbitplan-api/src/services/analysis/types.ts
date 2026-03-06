export type AnalysisAction = {
  description: string;
  ownerEmail?: string;
  dueDate?: string;
  confidence: number;
};

export type AnalysisResult = {
  decisions: string;
  risks: string;
  notes: string;
  actions: AnalysisAction[];
};

export type AnalysisInput = {
  meetingTitle: string;
  attendees: string[];
  transcript: string;
};

export interface AnalysisProvider {
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
}

