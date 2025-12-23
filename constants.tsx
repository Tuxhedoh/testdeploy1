
import { MemeTemplate, FontOption } from './types';

export const TRENDING_TEMPLATES: MemeTemplate[] = [
  { id: '1', name: 'Distracted Boyfriend', url: 'https://picsum.photos/seed/distracted/800/600' },
  { id: '2', name: 'Woman Yelling at Cat', url: 'https://picsum.photos/seed/cat/800/600' },
  { id: '3', name: 'Drake Hotline Bling', url: 'https://picsum.photos/seed/drake/800/600' },
  { id: '4', name: 'Success Kid', url: 'https://picsum.photos/seed/success/800/600' },
  { id: '5', name: 'Two Buttons', url: 'https://picsum.photos/seed/buttons/800/600' },
  { id: '6', name: 'Think About It', url: 'https://picsum.photos/seed/think/800/600' },
];

export const AVAILABLE_FONTS: FontOption[] = [
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Anton (Modern Impact)', value: 'Anton, sans-serif' },
  { name: 'Bebas Neue', value: 'Bebas Neue, sans-serif' },
  { name: 'Montserrat Black', value: 'Montserrat, sans-serif' },
  { name: 'Comic Style', value: 'Comic Neue, cursive' },
];

export const DEFAULT_FONT_SIZE = 48;
export const DEFAULT_FONT_FAMILY = AVAILABLE_FONTS[0].value;
