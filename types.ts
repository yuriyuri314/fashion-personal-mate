export type BodyShape = 'Triangle' | 'InvertedTriangle' | 'Rectangle' | 'Hourglass' | 'Apple' | 'BottomHeavy';
export type StylePreference = 'Casual' | 'Girlish' | 'Feminine' | 'Street' | 'Minimal';
export type Mood = 'Excitement' | 'Calm' | 'Active' | 'Confidence';
export type TPO = 'Date' | 'Interview' | 'Travel' | 'Meeting';

export interface UserProfile {
  height: string;
  bodyShape: BodyShape;
  style: StylePreference;
  mood: Mood;
  isBeginner: boolean;
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  description: string;
  colors: string[];
  items: string[];
  yuriComment: string;
  timestamp: number;
}
