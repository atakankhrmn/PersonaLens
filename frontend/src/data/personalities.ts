import { GroupTheme, MbtiCode, PersonalityGroupId, PersonalityTypeInfo } from '../types/personality';

export const PERSONALITY_GROUPS: Record<PersonalityGroupId, GroupTheme> = {
  analysts: {
    id: 'analysts',
    name: 'Analysts',
    tagline: 'Intuitive (N) and Thinking (T)',
    description:
      'Strategic, curious, and independent thinkers who prize logic, systems thinking, and intellectual mastery.',
    accentHex: '#88619A',
    inkHex: '#4F3460',
    softBgHex: '#F4EFF7',
    cardBgHex: '#F7F2FA',
    cardHoverBgHex: '#EFE6F5',
    borderHex: '#E1D2EB',
    barTrackHex: '#E9DDF2',
  },
  diplomats: {
    id: 'diplomats',
    name: 'Diplomats',
    tagline: 'Intuitive (N) and Feeling (F)',
    description:
      'Empathetic, imaginative, and purpose-driven communicators drawn to human connection, meaning, and shared growth.',
    accentHex: '#33A474',
    inkHex: '#1D6446',
    softBgHex: '#ECF7F1',
    cardBgHex: '#F0F9F4',
    cardHoverBgHex: '#E1F4EA',
    borderHex: '#C8E9D8',
    barTrackHex: '#D7EFE3',
  },
  sentinels: {
    id: 'sentinels',
    name: 'Sentinels',
    tagline: 'Observant (S) and Judging (J)',
    description:
      'Grounded, conscientious, and dependable organizers who build stability, clarity, and lasting community trust.',
    accentHex: '#4298B4',
    inkHex: '#205B70',
    softBgHex: '#ECF5F8',
    cardBgHex: '#F0F7FA',
    cardHoverBgHex: '#E1EFF5',
    borderHex: '#C7E2ED',
    barTrackHex: '#D6EAF2',
  },
  explorers: {
    id: 'explorers',
    name: 'Explorers',
    tagline: 'Observant (S) and Prospecting (P)',
    description:
      'Adaptable, observant, and spontaneous makers who learn by doing and bring kinetic energy to every moment.',
    accentHex: '#D99B26',
    inkHex: '#7A530B',
    softBgHex: '#FDF6E6',
    cardBgHex: '#FEF9EC',
    cardHoverBgHex: '#FAEFD2',
    borderHex: '#F2DFB0',
    barTrackHex: '#F6E8C2',
  },
};

export const GROUP_ORDER: PersonalityGroupId[] = [
  'analysts',
  'diplomats',
  'sentinels',
  'explorers',
];

export const PERSONALITY_TYPES: PersonalityTypeInfo[] = [
  // Analysts — Purple
  {
    code: 'INTJ',
    title: 'The Architect',
    group: 'analysts',
    shortDescription: 'Imaginative and strategic thinkers with a plan for everything.',
    fullDescription:
      'Architects blend long-range vision with rigorous analytical discipline. They naturally spot structural flaws, design coherent systems, and work quietly toward ambitious intellectual goals.',
    strengths: ['Strategic foresight', 'Independent judgment', 'Systems architecture'],
    writingVoice: 'Concise, structured, conceptual, and focused on underlying frameworks.',
  },
  {
    code: 'INTP',
    title: 'The Logician',
    group: 'analysts',
    shortDescription: 'Innovative inventors with an unquenchable thirst for knowledge.',
    fullDescription:
      'Logicians are captivated by patterns, edge cases, and first principles. They love testing ideas from every angle and refining mental models until every piece fits logically.',
    strengths: ['Pattern recognition', 'Intellectual curiosity', 'Objective analysis'],
    writingVoice: 'Exploratory, precise, nuanced, often weighing possibilities and caveats.',
  },
  {
    code: 'ENTJ',
    title: 'The Commander',
    group: 'analysts',
    shortDescription: 'Bold, imaginative, and strong-willed leaders who always find a way.',
    fullDescription:
      'Commanders turn sweeping ambitions into decisive action. Energized by complex challenges, they rally people around clear objectives and thrive on measurable momentum.',
    strengths: ['Decisive leadership', 'Long-term planning', 'Clear articulation'],
    writingVoice: 'Direct, assertive, goal-oriented, and briskly organized.',
  },
  {
    code: 'ENTP',
    title: 'The Debater',
    group: 'analysts',
    shortDescription: 'Smart and curious thinkers who cannot resist an intellectual challenge.',
    fullDescription:
      'Debaters thrive on sparring with fresh perspectives and questioning assumptions. Quick-witted and inventive, they connect unexpected dots and turn conversations into idea labs.',
    strengths: ['Rapid ideation', 'Mental agility', 'Playful reframing'],
    writingVoice: 'Witty, associative, questioning, and rich with analogies.',
  },

  // Diplomats — Green
  {
    code: 'INFJ',
    title: 'The Advocate',
    group: 'diplomats',
    shortDescription: 'Quiet and mystical, yet very inspiring and tireless idealists.',
    fullDescription:
      'Advocates combine deep empathy with an intuitive grasp of human motives. Guided by strong personal convictions, they seek meaningful ways to leave the world gentler and wiser.',
    strengths: ['Insightful empathy', 'Principled vision', 'Reflective depth'],
    writingVoice: 'Thoughtful, metaphorical, values-driven, and emotionally resonant.',
  },
  {
    code: 'INFP',
    title: 'The Mediator',
    group: 'diplomats',
    shortDescription: 'Poetic, kind, and altruistic people, always eager to help a good cause.',
    fullDescription:
      'Mediators navigate life through an internal compass of authenticity and compassion. Quietly observant, they uncover beauty in everyday details and give voice to unspoken feelings.',
    strengths: ['Authentic expression', 'Creative sensitivity', 'Deep compassion'],
    writingVoice: 'Introspective, lyrical, gentle, and rich in personal meaning.',
  },
  {
    code: 'ENFJ',
    title: 'The Protagonist',
    group: 'diplomats',
    shortDescription: 'Charismatic and inspiring leaders, able to mesmerize their listeners.',
    fullDescription:
      'Protagonists naturally sense the potential in others and bring people together around shared ideals. Warm, articulate, and encouraging, they lead through connection and trust.',
    strengths: ['Uplifting leadership', 'Social attunement', 'Persuasive warmth'],
    writingVoice: 'Encouraging, inclusive, expressive, and focused on shared purpose.',
  },
  {
    code: 'ENFP',
    title: 'The Campaigner',
    group: 'diplomats',
    shortDescription: 'Enthusiastic, creative, and sociable free spirits who always find a reason to smile.',
    fullDescription:
      'Campaigners radiate curiosity and warmth. They see human stories and exciting possibilities everywhere, turning ordinary moments into spontaneous adventures of connection.',
    strengths: ['Infectious enthusiasm', 'Creative storytelling', 'Genuine warmth'],
    writingVoice: 'Vibrant, conversational, imaginative, and brimming with curiosity.',
  },

  // Sentinels — Blue
  {
    code: 'ISTJ',
    title: 'The Logistician',
    group: 'sentinels',
    shortDescription: 'Practical and fact-minded individuals whose reliability cannot be doubted.',
    fullDescription:
      'Logisticians take pride in accuracy, integrity, and quiet follow-through. They trust proven methods, honor commitments without fanfare, and keep complex operations running smoothly.',
    strengths: ['Steadfast reliability', 'Methodical accuracy', 'Calm accountability'],
    writingVoice: 'Clear, factual, chronological, and grounded in concrete observations.',
  },
  {
    code: 'ISFJ',
    title: 'The Defender',
    group: 'sentinels',
    shortDescription: 'Very dedicated and warm protectors, always ready to defend their loved ones.',
    fullDescription:
      'Defenders notice the practical details that make others feel cared for and safe. Loyal, observant, and generous, they preserve traditions and nurture steady harmony.',
    strengths: ['Attentive care', 'Quiet loyalty', 'Practical memory'],
    writingVoice: 'Warm, considerate, grounded in personal memories and thoughtful details.',
  },
  {
    code: 'ESTJ',
    title: 'The Executive',
    group: 'sentinels',
    shortDescription: 'Excellent administrators, unsurpassed at managing things or people.',
    fullDescription:
      'Executives value clarity, civic order, and dependable execution. They step forward to organize teams, uphold clear standards, and turn ambiguous plans into reliable routines.',
    strengths: ['Structured coordination', 'Clear standards', 'Dependable follow-through'],
    writingVoice: 'Pragmatic, decisive, orderly, and focused on real-world outcomes.',
  },
  {
    code: 'ESFJ',
    title: 'The Consul',
    group: 'sentinels',
    shortDescription: 'Extraordinarily caring, social, and popular people, always eager to help.',
    fullDescription:
      'Consuls thrive on hospitality, shared milestones, and everyday kindness. Attuned to group harmony, they remember birthdays, bridge conversations, and keep circles connected.',
    strengths: ['Warm hospitality', 'Community building', 'Supportive action'],
    writingVoice: 'Friendly, relational, appreciative, and attentive to people around them.',
  },

  // Explorers — Yellow
  {
    code: 'ISTP',
    title: 'The Virtuoso',
    group: 'explorers',
    shortDescription: 'Bold and practical experimenters, masters of all kinds of tools.',
    fullDescription:
      'Virtuosos understand how things work by taking them apart with calm precision. Unflappable in a crisis, they blend mechanical curiosity with effortless independence.',
    strengths: ['Hands-on troubleshooting', 'Calm adaptability', 'Tactical precision'],
    writingVoice: 'Sparse, matter-of-fact, observant, and focused on how things actually work.',
  },
  {
    code: 'ISFP',
    title: 'The Adventurer',
    group: 'explorers',
    shortDescription: 'Flexible and charming artists, always ready to explore and experience something new.',
    fullDescription:
      'Adventurers live closely in tune with color, texture, sound, and personal freedom. Gentle yet fiercely authentic, they express their inner world through craft and lived experience.',
    strengths: ['Aesthetic sensibility', 'Present-moment awareness', 'Quiet authenticity'],
    writingVoice: 'Sensory, understated, personal, and attentive to mood and atmosphere.',
  },
  {
    code: 'ESTP',
    title: 'The Entrepreneur',
    group: 'explorers',
    shortDescription: 'Smart, energetic, and perceptive people who truly enjoy living on the edge.',
    fullDescription:
      'Entrepreneurs read a room in seconds and jump straight into the action. Resourceful, bold, and pragmatic, they prefer real-world momentum over abstract theory.',
    strengths: ['Quick improvisation', 'High-energy presence', 'Pragmatic nerve'],
    writingVoice: 'Punchy, fast-paced, action-focused, and anchored in immediate reality.',
  },
  {
    code: 'ESFP',
    title: 'The Entertainer',
    group: 'explorers',
    shortDescription: 'Spontaneous, energetic, and enthusiastic people—life is never boring around them.',
    fullDescription:
      'Entertainers bring warmth, humor, and celebration wherever they go. Deeply attuned to the joy of the present moment, they invite everyone around them to loosen up and belong.',
    strengths: ['Playful spontaneity', 'Social warmth', 'Lively storytelling'],
    writingVoice: 'Expressive, upbeat, vivid, and full of sensory anecdotes.',
  },
];

export const PERSONALITY_MAP: Record<MbtiCode, PersonalityTypeInfo> = PERSONALITY_TYPES.reduce(
  (acc, item) => {
    acc[item.code] = item;
    return acc;
  },
  {} as Record<MbtiCode, PersonalityTypeInfo>
);

export interface SamplePrompt {
  label: string;
  text: string;
}

export const SAMPLE_WRITING_PROMPTS: SamplePrompt[] = [
  {
    label: 'Creative Daydreamer',
    text: 'I spend hours sketching out half-formed ideas in notebooks during train rides, wondering how small conversations change the trajectory of someone’s entire week. Even when my schedule gets chaotic, I love meeting strangers over coffee, hearing what lights them up, and leaving room for spontaneous detours.',
  },
  {
    label: 'Systems Builder',
    text: 'Before I start any project, I map out the architecture on paper and look for edge cases that could break six months from now. I prefer quiet focus over long status meetings, and I get real satisfaction from simplifying a messy process into something clean, predictable, and scalable.',
  },
  {
    label: 'Grounded Organizer',
    text: 'Sunday evenings are for resetting my workspace, reviewing the week’s calendar, and checking in on family members to make sure everyone has what they need. I value clear expectations, keeping promises, and taking care of the practical details that make a home or team feel steady.',
  },
];
