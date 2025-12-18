/**
 * Charter & Course Framework Definition
 *
 * A comprehensive life direction framework that helps users:
 * 1. Define their personal values and life vision (Foundation)
 * 2. Set and track goals aligned with their vision (Recurring)
 * 3. Reflect on progress and adjust course (Recurring)
 *
 * @module charter-and-course
 */

import type { Framework } from '../../types/framework.types'

/**
 * Charter & Course Framework
 *
 * The flagship framework for intentional living and goal achievement.
 * Guides users from defining their core values through daily practice
 * and regular review cycles.
 */
export const charterAndCourseFramework: Framework = {
  id: 'charter-and-course',
  name: 'Charter & Course',
  tagline: 'Define your direction, navigate your journey',
  description: `Charter & Course is a structured approach to intentional living.
Start by creating your personal "charter" - a clear articulation of your values,
vision, and goals. Then use regular "course corrections" through daily check-ins,
weekly reviews, and monthly reflections to stay aligned with what matters most to you.

This framework helps you:
• Clarify what truly matters to you
• Set meaningful goals aligned with your values
• Build consistent reflection habits
• Track progress and celebrate wins
• Adjust course when life throws curveballs`,
  version: 1,
  icon: '🧭',
  color: '#6366f1',
  secondaryColor: '#818cf8',
  isActive: true,

  metadata: {
    schemaVersion: '1.0.0',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    authors: [
      {
        id: 'lifestyle-spaces',
        name: 'Lifestyle Spaces Team',
      },
    ],
    license: 'MIT',
    tags: ['life-planning', 'goals', 'values', 'reflection', 'productivity'],
    audience: 'Anyone seeking intentional living and personal growth',
    foundationEstimate: '2-3 weeks',
    cadenceDescription:
      'Daily check-ins (5 min), weekly reviews (15-20 min), monthly deep dives (30-45 min)',
  },

  categories: [
    {
      id: 'foundation',
      name: 'Foundation',
      description: 'One-time templates to establish your personal charter',
      order: 1,
      icon: '🏛️',
      color: '#6366f1',
    },
    {
      id: 'daily',
      name: 'Daily Practice',
      description: 'Quick daily check-ins to stay connected to your goals',
      order: 2,
      icon: '☀️',
      color: '#f59e0b',
    },
    {
      id: 'weekly',
      name: 'Weekly Review',
      description: 'Weekly reflection and planning sessions',
      order: 3,
      icon: '📅',
      color: '#10b981',
    },
    {
      id: 'monthly',
      name: 'Monthly Review',
      description: 'Monthly deep dives into progress and adjustments',
      order: 4,
      icon: '🌙',
      color: '#8b5cf6',
    },
    {
      id: 'quarterly',
      name: 'Quarterly Planning',
      description: 'Quarterly strategic reviews and goal setting',
      order: 5,
      icon: '🎯',
      color: '#ef4444',
    },
  ],

  templates: [
    // ==================== FOUNDATION ====================
    {
      id: 'cc-values-discovery',
      name: 'Values Discovery',
      description: 'Discover and articulate your core personal values',
      guidance:
        'Take your time with this exercise. Your values are the foundation for all your goals and decisions.',
      categoryId: 'foundation',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 1,
      icon: '💎',
      color: '#6366f1',
      prerequisites: [],
      unlockedMessage: 'Start your journey by discovering your core values!',
      content: {
        sections: [
          {
            id: 'intro',
            title: 'Introduction',
            description: 'Understanding personal values',
            order: 1,
          },
          {
            id: 'discovery',
            title: 'Value Discovery',
            description: 'Explore what matters most to you',
            order: 2,
          },
          {
            id: 'prioritization',
            title: 'Prioritization',
            description: 'Rank your top values',
            order: 3,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-life-vision',
      name: 'Life Vision',
      description: 'Create a compelling vision for your ideal life',
      guidance: 'Dream big! Your vision should inspire and motivate you.',
      categoryId: 'foundation',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 2,
      icon: '🔮',
      color: '#8b5cf6',
      prerequisites: ['cc-values-discovery'],
      lockedMessage: 'Complete Values Discovery first to unlock your Life Vision template.',
      unlockedMessage: 'Now that you know your values, envision your ideal life!',
      content: {
        sections: [
          {
            id: 'future-self',
            title: 'Future Self',
            description: 'Imagine your ideal future',
            order: 1,
          },
          {
            id: 'life-areas',
            title: 'Life Areas',
            description: 'Vision for each area of life',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-goal-setting',
      name: 'Goal Setting',
      description: 'Set meaningful goals aligned with your values and vision',
      guidance: 'Choose goals that excite you and align with your vision.',
      categoryId: 'foundation',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 3,
      icon: '🎯',
      color: '#10b981',
      prerequisites: ['cc-life-vision'],
      lockedMessage: 'Define your Life Vision first to set aligned goals.',
      unlockedMessage: 'Transform your vision into actionable goals!',
      content: {
        sections: [
          {
            id: 'goals',
            title: 'Goals',
            description: 'Define your goals',
            order: 1,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-obstacles-strategies',
      name: 'Obstacles & Strategies',
      description: 'Identify potential obstacles and plan strategies to overcome them',
      guidance: 'Anticipating challenges helps you prepare for success.',
      categoryId: 'foundation',
      lifecycle: 'foundation',
      frequency: 'once',
      order: 4,
      icon: '🛡️',
      color: '#f59e0b',
      prerequisites: ['cc-goal-setting'],
      lockedMessage: 'Set your goals first to identify potential obstacles.',
      unlockedMessage: 'Prepare for challenges by planning your strategies!',
      content: {
        sections: [
          {
            id: 'obstacles',
            title: 'Obstacles',
            description: 'Identify potential challenges',
            order: 1,
          },
          {
            id: 'strategies',
            title: 'Strategies',
            description: 'Plan how to overcome obstacles',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },

    // ==================== DAILY ====================
    {
      id: 'cc-daily-checkin',
      name: 'Daily Check-in',
      description: 'Quick daily reflection to stay connected to your goals',
      guidance: 'This should take 5-10 minutes. Be honest with yourself.',
      categoryId: 'daily',
      lifecycle: 'recurring',
      frequency: 'daily',
      order: 1,
      icon: '☀️',
      color: '#f59e0b',
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 0,
      lockedMessage: 'Complete your foundation goals first to unlock daily check-ins.',
      unlockedMessage: 'Start your daily practice of intentional reflection!',
      content: {
        sections: [
          {
            id: 'morning',
            title: 'Morning Intentions',
            order: 1,
          },
          {
            id: 'evening',
            title: 'Evening Reflection',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-gratitude',
      name: 'Gratitude Practice',
      description: 'Cultivate gratitude aligned with your values',
      guidance: 'Focus on specific things you are grateful for today.',
      categoryId: 'daily',
      lifecycle: 'recurring',
      frequency: 'daily',
      order: 2,
      icon: '🙏',
      color: '#ec4899',
      prerequisites: ['cc-values-discovery'],
      cooldownDays: 0,
      lockedMessage: 'Discover your values first to practice gratitude.',
      unlockedMessage: 'Cultivate gratitude aligned with your values!',
      content: {
        sections: [
          {
            id: 'gratitude',
            title: 'Gratitude',
            order: 1,
          },
        ],
        fields: {},
      },
      version: 1,
    },

    // ==================== WEEKLY ====================
    {
      id: 'cc-weekly-review',
      name: 'Weekly Review',
      description: 'Review your week and plan for the next one',
      guidance: 'Set aside 15-20 minutes for this reflection.',
      categoryId: 'weekly',
      lifecycle: 'recurring',
      frequency: 'weekly',
      order: 1,
      icon: '📅',
      color: '#10b981',
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 5,
      unlockConditions: [
        {
          type: 'template_count',
          templateId: 'cc-daily-checkin',
          minCount: 3,
          description: 'Complete at least 3 daily check-ins',
        },
      ],
      lockedMessage: 'Complete your goals and a few daily check-ins first.',
      unlockedMessage: 'Time for your first weekly review!',
      content: {
        sections: [
          {
            id: 'wins',
            title: 'Wins',
            order: 1,
          },
          {
            id: 'challenges',
            title: 'Challenges',
            order: 2,
          },
          {
            id: 'next-week',
            title: 'Next Week',
            order: 3,
          },
        ],
        fields: {},
      },
      version: 1,
    },

    // ==================== MONTHLY ====================
    {
      id: 'cc-monthly-review',
      name: 'Monthly Review',
      description: 'Deep dive into your monthly progress and adjustments',
      guidance: 'This is your chance for deeper reflection. Take 30-45 minutes.',
      categoryId: 'monthly',
      lifecycle: 'recurring',
      frequency: 'monthly',
      order: 1,
      icon: '🌙',
      color: '#8b5cf6',
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 25,
      unlockConditions: [
        {
          type: 'template_count',
          templateId: 'cc-weekly-review',
          minCount: 2,
          description: 'Complete at least 2 weekly reviews',
        },
      ],
      lockedMessage: 'Build your weekly review habit first (2+ reviews needed).',
      unlockedMessage: 'Ready for a deeper monthly reflection!',
      content: {
        sections: [
          {
            id: 'progress',
            title: 'Progress Review',
            order: 1,
          },
          {
            id: 'adjustments',
            title: 'Adjustments',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-goal-refresh',
      name: 'Goal Refresh',
      description: 'Review and adjust your goals based on progress',
      guidance: 'Are your goals still aligned with your vision?',
      categoryId: 'monthly',
      lifecycle: 'recurring',
      frequency: 'monthly',
      order: 2,
      icon: '🔄',
      color: '#06b6d4',
      prerequisites: ['cc-monthly-review'],
      cooldownDays: 25,
      lockedMessage: 'Complete a monthly review first.',
      unlockedMessage: 'Time to refresh and adjust your goals!',
      content: {
        sections: [
          {
            id: 'review',
            title: 'Goal Review',
            order: 1,
          },
          {
            id: 'updates',
            title: 'Goal Updates',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },

    // ==================== QUARTERLY ====================
    {
      id: 'cc-quarterly-review',
      name: 'Quarterly Review',
      description: 'Big-picture quarterly assessment and strategic planning',
      guidance: 'This is your chance to step back and see the bigger picture.',
      categoryId: 'quarterly',
      lifecycle: 'milestone',
      frequency: 'quarterly',
      order: 1,
      icon: '🎯',
      color: '#ef4444',
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 80,
      unlockConditions: [
        {
          type: 'template_count',
          templateId: 'cc-monthly-review',
          minCount: 2,
          description: 'Complete at least 2 monthly reviews',
        },
      ],
      lockedMessage: 'Build your monthly review habit first (2+ reviews needed).',
      unlockedMessage: 'Time for a big-picture quarterly assessment!',
      content: {
        sections: [
          {
            id: 'quarter-review',
            title: 'Quarter Review',
            order: 1,
          },
          {
            id: 'next-quarter',
            title: 'Next Quarter Planning',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },
    {
      id: 'cc-annual-vision-refresh',
      name: 'Annual Vision Refresh',
      description: 'Revisit and refresh your life vision annually',
      guidance: 'A full year of growth! Time to evolve your vision.',
      categoryId: 'quarterly',
      lifecycle: 'special',
      frequency: 'yearly',
      order: 2,
      icon: '🌟',
      color: '#f59e0b',
      prerequisites: ['cc-quarterly-review'],
      cooldownDays: 350,
      unlockConditions: [
        {
          type: 'template_count',
          templateId: 'cc-quarterly-review',
          minCount: 3,
          description: 'Complete at least 3 quarterly reviews',
        },
      ],
      lockedMessage: 'Complete several quarterly reviews to unlock annual vision refresh.',
      unlockedMessage: 'A full year of growth! Time to refresh your life vision.',
      content: {
        sections: [
          {
            id: 'year-review',
            title: 'Year in Review',
            order: 1,
          },
          {
            id: 'vision-update',
            title: 'Vision Update',
            order: 2,
          },
        ],
        fields: {},
      },
      version: 1,
    },
  ],
}
