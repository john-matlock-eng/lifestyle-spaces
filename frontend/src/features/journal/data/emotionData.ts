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
]

/**
 * Get all emotions for a specific level
 */
export function getEmotionsByLevel(level: Emotion['level']): Emotion[] {
  return emotions.filter((e) => e.level === level)
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
