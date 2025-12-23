
export type MemeStyle = 'classic' | 'modern' | 'demotivational';
export type MemeTone = 'sarcastic' | 'wholesome' | 'gen-z' | 'brainrot' | 'edgy';

export interface MemeState {
  imageUrl: string | null;
  topText: string;
  bottomText: string;
  fontSize: number;
  textColor: string;
  fontFamily: string;
  topOffset: number;    // % from top (or Y position)
  bottomOffset: number; // % from top (or Y position)
  topX?: number;       // % from left
  bottomX?: number;    // % from left
  style: MemeStyle;
}

export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
}

export interface Suggestion {
  top: string;
  bottom: string;
  suggestedColor?: string;
}

export interface FontOption {
  name: string;
  value: string;
}
