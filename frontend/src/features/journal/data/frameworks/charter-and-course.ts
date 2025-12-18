/**
 * Charter & Course Framework Definition
 *
 * A comprehensive life direction framework that helps users:
 * 1. Define their personal values and life vision (Foundation)
 * 2. Set and track goals aligned with their vision (Recurring)
 * 3. Reflect on progress and adjust course (Recurring)
 *
 * Structure:
 * - Foundation templates: One-time setup of values, vision, and initial goals
 * - Daily: Quick check-ins and gratitude
 * - Weekly: Progress review and planning
 * - Monthly: Deeper reflection and goal adjustment
 * - Quarterly: Major milestone review and strategic planning
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
  color: '#6366f1', // Indigo
  foundationEstimate: '2-3 weeks',
  cadenceDescription: 'Daily check-ins (5 min), weekly reviews (15-20 min), monthly deep dives (30-45 min)',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  categories: [
    {
      id: 'foundation',
      name: 'Foundation',
      description: 'One-time templates to establish your personal charter',
      order: 1,
      icon: '🏛️',
    },
    {
      id: 'daily',
      name: 'Daily Practice',
      description: 'Quick daily check-ins to stay connected to your goals',
      order: 2,
      icon: '☀️',
    },
    {
      id: 'weekly',
      name: 'Weekly Review',
      description: 'Weekly reflection and planning sessions',
      order: 3,
      icon: '📅',
    },
    {
      id: 'monthly',
      name: 'Monthly Review',
      description: 'Monthly deep dives into progress and adjustments',
      order: 4,
      icon: '🌙',
    },
    {
      id: 'quarterly',
      name: 'Quarterly Planning',
      description: 'Quarterly strategic reviews and goal setting',
      order: 5,
      icon: '🎯',
    },
  ],

  templates: [
    // ==================== FOUNDATION ====================
    {
      templateId: 'cc-values-discovery',
      categoryId: 'foundation',
      frequency: 'once',
      order: 1,
      isFoundation: true,
      prerequisites: [],
      lockedMessage: undefined,
      unlockedMessage: 'Start your journey by discovering your core values!',
    },
    {
      templateId: 'cc-life-vision',
      categoryId: 'foundation',
      frequency: 'once',
      order: 2,
      isFoundation: true,
      prerequisites: ['cc-values-discovery'],
      lockedMessage: 'Complete Values Discovery first to unlock your Life Vision template.',
      unlockedMessage: 'Now that you know your values, envision your ideal life!',
    },
    {
      templateId: 'cc-goal-setting',
      categoryId: 'foundation',
      frequency: 'once',
      order: 3,
      isFoundation: true,
      prerequisites: ['cc-life-vision'],
      lockedMessage: 'Define your Life Vision first to set aligned goals.',
      unlockedMessage: 'Transform your vision into actionable goals!',
    },
    {
      templateId: 'cc-obstacles-strategies',
      categoryId: 'foundation',
      frequency: 'once',
      order: 4,
      isFoundation: true,
      prerequisites: ['cc-goal-setting'],
      lockedMessage: 'Set your goals first to identify potential obstacles.',
      unlockedMessage: 'Prepare for challenges by planning your strategies!',
    },

    // ==================== DAILY ====================
    {
      templateId: 'cc-daily-checkin',
      categoryId: 'daily',
      frequency: 'daily',
      order: 1,
      isFoundation: false,
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 0, // Can be done every day
      lockedMessage: 'Complete your foundation goals first to unlock daily check-ins.',
      unlockedMessage: 'Start your daily practice of intentional reflection!',
    },
    {
      templateId: 'cc-gratitude',
      categoryId: 'daily',
      frequency: 'daily',
      order: 2,
      isFoundation: false,
      prerequisites: ['cc-values-discovery'],
      cooldownDays: 0,
      lockedMessage: 'Discover your values first to practice gratitude.',
      unlockedMessage: 'Cultivate gratitude aligned with your values!',
    },

    // ==================== WEEKLY ====================
    {
      templateId: 'cc-weekly-review',
      categoryId: 'weekly',
      frequency: 'weekly',
      order: 1,
      isFoundation: false,
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 5, // Suggest after 5 days
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
    },

    // ==================== MONTHLY ====================
    {
      templateId: 'cc-monthly-review',
      categoryId: 'monthly',
      frequency: 'monthly',
      order: 1,
      isFoundation: false,
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 25, // Suggest after ~25 days
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
    },
    {
      templateId: 'cc-goal-refresh',
      categoryId: 'monthly',
      frequency: 'monthly',
      order: 2,
      isFoundation: false,
      prerequisites: ['cc-monthly-review'],
      cooldownDays: 25,
      lockedMessage: 'Complete a monthly review first.',
      unlockedMessage: 'Time to refresh and adjust your goals!',
    },

    // ==================== QUARTERLY ====================
    {
      templateId: 'cc-quarterly-review',
      categoryId: 'quarterly',
      frequency: 'quarterly',
      order: 1,
      isFoundation: false,
      prerequisites: ['cc-goal-setting'],
      cooldownDays: 80, // Suggest after ~80 days
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
    },
    {
      templateId: 'cc-annual-vision-refresh',
      categoryId: 'quarterly',
      frequency: 'yearly',
      order: 2,
      isFoundation: false,
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
    },
  ],
}
