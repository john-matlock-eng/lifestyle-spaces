/**
 * Emotion data model for the emotion wheel
 * Based on the Plutchik emotion wheel with core, secondary, and tertiary levels
 */

export interface Emotion {
  id: string
  label: string
  color: string
  parent?: string
  level: 'core' | 'secondary' | 'tertiary'
}

export const emotionColors = {
  // Core emotions - matching the original wheel
  happy: '#FBBF24', // Yellow
  sad: '#60A5FA', // Blue
  disgusted: '#9CA3AF', // Gray
  angry: '#F87171', // Red
  fearful: '#34D399', // Green
  bad: '#6B7280', // Darker gray
  surprised: '#C084FC', // Purple

  // Color variations for sub-emotions
  happyLight: '#FEF3C7',
  happyDark: '#F59E0B',
  sadLight: '#DBEAFE',
  sadDark: '#2563EB',
  angryLight: '#FEE2E2',
  angryDark: '#DC2626',
  fearfulLight: '#D1FAE5',
  fearfulDark: '#059669',
  surprisedLight: '#EDE9FE',
  surprisedDark: '#7C3AED',
  disgustedLight: '#F3F4F6',
  disgustedDark: '#4B5563',
  badLight: '#E5E7EB',
  badDark: '#374151',
}

export const emotions: Emotion[] = [
  // Core emotions (level 1 - center)
  { id: 'happy', label: 'Happy', color: emotionColors.happy, level: 'core' },
  { id: 'sad', label: 'Sad', color: emotionColors.sad, level: 'core' },
  { id: 'disgusted', label: 'Disgusted', color: emotionColors.disgusted, level: 'core' },
  { id: 'angry', label: 'Angry', color: emotionColors.angry, level: 'core' },
  { id: 'fearful', label: 'Fearful', color: emotionColors.fearful, level: 'core' },
  { id: 'bad', label: 'Bad', color: emotionColors.bad, level: 'core' },
  { id: 'surprised', label: 'Surprised', color: emotionColors.surprised, level: 'core' },

  // Happy branch (secondary)
  { id: 'playful', label: 'Playful', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'content', label: 'Content', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'interested', label: 'Interested', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'proud', label: 'Proud', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'accepted', label: 'Accepted', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'powerful', label: 'Powerful', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'peaceful', label: 'Peaceful', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'trusting', label: 'Trusting', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },
  { id: 'optimistic', label: 'Optimistic', color: emotionColors.happyLight, parent: 'happy', level: 'secondary' },

  // Sad branch (secondary)
  { id: 'lonely', label: 'Lonely', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },
  { id: 'vulnerable', label: 'Vulnerable', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },
  { id: 'despair', label: 'Despair', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },
  { id: 'guilty', label: 'Guilty', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },
  { id: 'depressed', label: 'Depressed', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },
  { id: 'hurt', label: 'Hurt', color: emotionColors.sadLight, parent: 'sad', level: 'secondary' },

  // Angry branch (secondary)
  { id: 'let_down', label: 'Let Down', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'humiliated', label: 'Humiliated', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'bitter', label: 'Bitter', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'mad', label: 'Mad', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'aggressive', label: 'Aggressive', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'frustrated', label: 'Frustrated', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'distant', label: 'Distant', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },
  { id: 'critical', label: 'Critical', color: emotionColors.angryLight, parent: 'angry', level: 'secondary' },

  // Fearful branch (secondary)
  { id: 'scared', label: 'Scared', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },
  { id: 'anxious', label: 'Anxious', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },
  { id: 'insecure', label: 'Insecure', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },
  { id: 'weak', label: 'Weak', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },
  { id: 'rejected', label: 'Rejected', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },
  { id: 'threatened', label: 'Threatened', color: emotionColors.fearfulLight, parent: 'fearful', level: 'secondary' },

  // Bad branch (secondary)
  { id: 'bored', label: 'Bored', color: emotionColors.badLight, parent: 'bad', level: 'secondary' },
  { id: 'busy', label: 'Busy', color: emotionColors.badLight, parent: 'bad', level: 'secondary' },
  { id: 'stressed', label: 'Stressed', color: emotionColors.badLight, parent: 'bad', level: 'secondary' },
  { id: 'tired', label: 'Tired', color: emotionColors.badLight, parent: 'bad', level: 'secondary' },

  // Surprised branch (secondary)
  { id: 'startled', label: 'Startled', color: emotionColors.surprisedLight, parent: 'surprised', level: 'secondary' },
  { id: 'confused', label: 'Confused', color: emotionColors.surprisedLight, parent: 'surprised', level: 'secondary' },
  { id: 'amazed', label: 'Amazed', color: emotionColors.surprisedLight, parent: 'surprised', level: 'secondary' },
  { id: 'excited', label: 'Excited', color: emotionColors.surprisedLight, parent: 'surprised', level: 'secondary' },

  // Disgusted branch (secondary)
  { id: 'disapproving', label: 'Disapproving', color: emotionColors.disgustedLight, parent: 'disgusted', level: 'secondary' },
  { id: 'disappointed', label: 'Disappointed', color: emotionColors.disgustedLight, parent: 'disgusted', level: 'secondary' },
  { id: 'awful', label: 'Awful', color: emotionColors.disgustedLight, parent: 'disgusted', level: 'secondary' },
  { id: 'repelled', label: 'Repelled', color: emotionColors.disgustedLight, parent: 'disgusted', level: 'secondary' },

  // Tertiary emotions - Happy branch
  { id: 'aroused', label: 'Aroused', color: emotionColors.happyDark, parent: 'playful', level: 'tertiary' },
  { id: 'cheeky', label: 'Cheeky', color: emotionColors.happyDark, parent: 'playful', level: 'tertiary' },
  { id: 'free', label: 'Free', color: emotionColors.happyDark, parent: 'content', level: 'tertiary' },
  { id: 'joyful', label: 'Joyful', color: emotionColors.happyDark, parent: 'content', level: 'tertiary' },
  { id: 'curious', label: 'Curious', color: emotionColors.happyDark, parent: 'interested', level: 'tertiary' },
  { id: 'inquisitive', label: 'Inquisitive', color: emotionColors.happyDark, parent: 'interested', level: 'tertiary' },
  { id: 'successful', label: 'Successful', color: emotionColors.happyDark, parent: 'proud', level: 'tertiary' },
  { id: 'confident', label: 'Confident', color: emotionColors.happyDark, parent: 'proud', level: 'tertiary' },
  { id: 'respected', label: 'Respected', color: emotionColors.happyDark, parent: 'accepted', level: 'tertiary' },
  { id: 'valued', label: 'Valued', color: emotionColors.happyDark, parent: 'accepted', level: 'tertiary' },
  { id: 'courageous', label: 'Courageous', color: emotionColors.happyDark, parent: 'powerful', level: 'tertiary' },
  { id: 'creative', label: 'Creative', color: emotionColors.happyDark, parent: 'powerful', level: 'tertiary' },
  { id: 'loving', label: 'Loving', color: emotionColors.happyDark, parent: 'peaceful', level: 'tertiary' },
  { id: 'thankful', label: 'Thankful', color: emotionColors.happyDark, parent: 'peaceful', level: 'tertiary' },
  { id: 'sensitive', label: 'Sensitive', color: emotionColors.happyDark, parent: 'trusting', level: 'tertiary' },
  { id: 'intimate', label: 'Intimate', color: emotionColors.happyDark, parent: 'trusting', level: 'tertiary' },
  { id: 'hopeful', label: 'Hopeful', color: emotionColors.happyDark, parent: 'optimistic', level: 'tertiary' },
  { id: 'inspired', label: 'Inspired', color: emotionColors.happyDark, parent: 'optimistic', level: 'tertiary' },

  // Tertiary emotions - Sad branch
  { id: 'isolated', label: 'Isolated', color: emotionColors.sadDark, parent: 'lonely', level: 'tertiary' },
  { id: 'abandoned', label: 'Abandoned', color: emotionColors.sadDark, parent: 'lonely', level: 'tertiary' },
  { id: 'fragile', label: 'Fragile', color: emotionColors.sadDark, parent: 'vulnerable', level: 'tertiary' },
  { id: 'victimized', label: 'Victimized', color: emotionColors.sadDark, parent: 'vulnerable', level: 'tertiary' },
  { id: 'grief', label: 'Grief', color: emotionColors.sadDark, parent: 'despair', level: 'tertiary' },
  { id: 'powerless', label: 'Powerless', color: emotionColors.sadDark, parent: 'despair', level: 'tertiary' },
  { id: 'ashamed', label: 'Ashamed', color: emotionColors.sadDark, parent: 'guilty', level: 'tertiary' },
  { id: 'remorseful', label: 'Remorseful', color: emotionColors.sadDark, parent: 'guilty', level: 'tertiary' },
  { id: 'inferior', label: 'Inferior', color: emotionColors.sadDark, parent: 'depressed', level: 'tertiary' },
  { id: 'empty', label: 'Empty', color: emotionColors.sadDark, parent: 'depressed', level: 'tertiary' },
  { id: 'embarrassed', label: 'Embarrassed', color: emotionColors.sadDark, parent: 'hurt', level: 'tertiary' },
  { id: 'hurt_disappointed', label: 'Disappointed', color: emotionColors.sadDark, parent: 'hurt', level: 'tertiary' },

  // Tertiary emotions - Angry branch
  { id: 'betrayed', label: 'Betrayed', color: emotionColors.angryDark, parent: 'let_down', level: 'tertiary' },
  { id: 'resentful', label: 'Resentful', color: emotionColors.angryDark, parent: 'let_down', level: 'tertiary' },
  { id: 'disrespected', label: 'Disrespected', color: emotionColors.angryDark, parent: 'humiliated', level: 'tertiary' },
  { id: 'ridiculed', label: 'Ridiculed', color: emotionColors.angryDark, parent: 'humiliated', level: 'tertiary' },
  { id: 'indignant', label: 'Indignant', color: emotionColors.angryDark, parent: 'bitter', level: 'tertiary' },
  { id: 'violated', label: 'Violated', color: emotionColors.angryDark, parent: 'bitter', level: 'tertiary' },
  { id: 'furious', label: 'Furious', color: emotionColors.angryDark, parent: 'mad', level: 'tertiary' },
  { id: 'jealous', label: 'Jealous', color: emotionColors.angryDark, parent: 'mad', level: 'tertiary' },
  { id: 'provoked', label: 'Provoked', color: emotionColors.angryDark, parent: 'aggressive', level: 'tertiary' },
  { id: 'hostile', label: 'Hostile', color: emotionColors.angryDark, parent: 'aggressive', level: 'tertiary' },
  { id: 'infuriated', label: 'Infuriated', color: emotionColors.angryDark, parent: 'frustrated', level: 'tertiary' },
  { id: 'annoyed', label: 'Annoyed', color: emotionColors.angryDark, parent: 'frustrated', level: 'tertiary' },
  { id: 'withdrawn', label: 'Withdrawn', color: emotionColors.angryDark, parent: 'distant', level: 'tertiary' },
  { id: 'numb', label: 'Numb', color: emotionColors.angryDark, parent: 'distant', level: 'tertiary' },
  { id: 'skeptical', label: 'Skeptical', color: emotionColors.angryDark, parent: 'critical', level: 'tertiary' },
  { id: 'dismissive', label: 'Dismissive', color: emotionColors.angryDark, parent: 'critical', level: 'tertiary' },

  // Tertiary emotions - Fearful branch
  { id: 'helpless', label: 'Helpless', color: emotionColors.fearfulDark, parent: 'scared', level: 'tertiary' },
  { id: 'frightened', label: 'Frightened', color: emotionColors.fearfulDark, parent: 'scared', level: 'tertiary' },
  { id: 'overwhelmed', label: 'Overwhelmed', color: emotionColors.fearfulDark, parent: 'anxious', level: 'tertiary' },
  { id: 'worried', label: 'Worried', color: emotionColors.fearfulDark, parent: 'anxious', level: 'tertiary' },
  { id: 'inadequate', label: 'Inadequate', color: emotionColors.fearfulDark, parent: 'insecure', level: 'tertiary' },
  { id: 'inferior_fear', label: 'Inferior', color: emotionColors.fearfulDark, parent: 'insecure', level: 'tertiary' },
  { id: 'worthless', label: 'Worthless', color: emotionColors.fearfulDark, parent: 'weak', level: 'tertiary' },
  { id: 'insignificant', label: 'Insignificant', color: emotionColors.fearfulDark, parent: 'weak', level: 'tertiary' },
  { id: 'excluded', label: 'Excluded', color: emotionColors.fearfulDark, parent: 'rejected', level: 'tertiary' },
  { id: 'persecuted', label: 'Persecuted', color: emotionColors.fearfulDark, parent: 'rejected', level: 'tertiary' },
  { id: 'nervous', label: 'Nervous', color: emotionColors.fearfulDark, parent: 'threatened', level: 'tertiary' },
  { id: 'exposed', label: 'Exposed', color: emotionColors.fearfulDark, parent: 'threatened', level: 'tertiary' },

  // Tertiary emotions - Bad branch
  { id: 'indifferent', label: 'Indifferent', color: emotionColors.badDark, parent: 'bored', level: 'tertiary' },
  { id: 'apathetic', label: 'Apathetic', color: emotionColors.badDark, parent: 'bored', level: 'tertiary' },
  { id: 'pressured', label: 'Pressured', color: emotionColors.badDark, parent: 'busy', level: 'tertiary' },
  { id: 'rushed', label: 'Rushed', color: emotionColors.badDark, parent: 'busy', level: 'tertiary' },
  { id: 'overwhelmed_stress', label: 'Overwhelmed', color: emotionColors.badDark, parent: 'stressed', level: 'tertiary' },
  { id: 'out_of_control', label: 'Out of control', color: emotionColors.badDark, parent: 'stressed', level: 'tertiary' },
  { id: 'sleepy', label: 'Sleepy', color: emotionColors.badDark, parent: 'tired', level: 'tertiary' },
  { id: 'unfocused', label: 'Unfocused', color: emotionColors.badDark, parent: 'tired', level: 'tertiary' },

  // Tertiary emotions - Surprised branch
  { id: 'shocked', label: 'Shocked', color: emotionColors.surprisedDark, parent: 'startled', level: 'tertiary' },
  { id: 'dismayed', label: 'Dismayed', color: emotionColors.surprisedDark, parent: 'startled', level: 'tertiary' },
  { id: 'disillusioned', label: 'Disillusioned', color: emotionColors.surprisedDark, parent: 'confused', level: 'tertiary' },
  { id: 'perplexed', label: 'Perplexed', color: emotionColors.surprisedDark, parent: 'confused', level: 'tertiary' },
  { id: 'astonished', label: 'Astonished', color: emotionColors.surprisedDark, parent: 'amazed', level: 'tertiary' },
  { id: 'awe', label: 'Awe', color: emotionColors.surprisedDark, parent: 'amazed', level: 'tertiary' },
  { id: 'eager', label: 'Eager', color: emotionColors.surprisedDark, parent: 'excited', level: 'tertiary' },
  { id: 'energetic', label: 'Energetic', color: emotionColors.surprisedDark, parent: 'excited', level: 'tertiary' },

  // Tertiary emotions - Disgusted branch
  { id: 'judgmental', label: 'Judgmental', color: emotionColors.disgustedDark, parent: 'disapproving', level: 'tertiary' },
  { id: 'embarrassed_disgust', label: 'Embarrassed', color: emotionColors.disgustedDark, parent: 'disapproving', level: 'tertiary' },
  { id: 'appalled', label: 'Appalled', color: emotionColors.disgustedDark, parent: 'disappointed', level: 'tertiary' },
  { id: 'revolted', label: 'Revolted', color: emotionColors.disgustedDark, parent: 'disappointed', level: 'tertiary' },
  { id: 'nauseated', label: 'Nauseated', color: emotionColors.disgustedDark, parent: 'awful', level: 'tertiary' },
  { id: 'detestable', label: 'Detestable', color: emotionColors.disgustedDark, parent: 'awful', level: 'tertiary' },
  { id: 'horrified', label: 'Horrified', color: emotionColors.disgustedDark, parent: 'repelled', level: 'tertiary' },
  { id: 'hesitant', label: 'Hesitant', color: emotionColors.disgustedDark, parent: 'repelled', level: 'tertiary' },
]

/**
 * Get all emotions for a specific level
 */
export function getEmotionsByLevel(level: Emotion['level']): Emotion[] {
  return emotions.filter((e) => e.level === level)
}

/**
 * Get all core emotions
 */
export function getCoreEmotions(): Emotion[] {
  return emotions.filter((e) => e.level === 'core')
}

/**
 * Get secondary emotions for a parent core emotion
 */
export function getSecondaryEmotions(parentId: string): Emotion[] {
  return emotions.filter((e) => e.level === 'secondary' && e.parent === parentId)
}

/**
 * Get tertiary emotions for a parent secondary emotion
 */
export function getTertiaryEmotions(parentId: string): Emotion[] {
  return emotions.filter((e) => e.level === 'tertiary' && e.parent === parentId)
}

/**
 * Get child emotions for a parent emotion
 */
export function getChildEmotions(parentId: string): Emotion[] {
  return emotions.filter((e) => e.parent === parentId)
}

/**
 * Get emotion by ID
 */
export function getEmotionById(id: string): Emotion | undefined {
  return emotions.find((e) => e.id === id)
}

/**
 * Get the full path from core to a specific emotion
 */
export function getEmotionPath(emotionId: string): Emotion[] {
  const path: Emotion[] = []
  let current = getEmotionById(emotionId)

  while (current) {
    path.unshift(current)
    current = current.parent ? getEmotionById(current.parent) : undefined
  }

  return path
}

/**
 * Get emoji for an emotion
 */
export function getEmotionEmoji(emotionId: string): string {
  const emojiMap: Record<string, string> = {
    // Core emotions
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    surprised: '😲',
    disgusted: '🤢',
    bad: '😟',

    // Secondary emotions
    playful: '😄',
    content: '😌',
    proud: '😤',
    excited: '🤗',
    peaceful: '😇',
    powerful: '💪',
    lonely: '😔',
    vulnerable: '🥺',
    despair: '😞',
    guilty: '😣',
    depressed: '😔',
    hurt: '💔',
    mad: '😡',
    aggressive: '👿',
    frustrated: '😤',
    scared: '😱',
    anxious: '😰',
    insecure: '😟',
    confused: '😕',
    amazed: '🤩',
    disappointed: '😞',
    awful: '😣',
    tired: '😴',
    stressed: '😫',

    // Default
    default: '💭',
  }

  return emojiMap[emotionId] || emojiMap.default
}
