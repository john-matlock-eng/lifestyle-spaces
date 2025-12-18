/**
 * Charter & Course Framework Definition
 *
 * A comprehensive life direction framework built around:
 * 1. Personal Charter - Define core identity, values, and commitments
 * 2. Quarterly Snapshot - Review and plan each quarter
 * 3. Weekly Scoreboard - Track lead measures weekly
 * 4. Reset Protocol - Get back on track when needed
 *
 * @module charter-and-course
 */

import type { Framework } from '../../types/framework.types'
import charterAndCourseJson from '../../schemas/charter-and-course.json'

/**
 * Charter & Course Framework
 *
 * The flagship framework for intentional living and personal accountability.
 * Guides users from defining their personal charter through weekly practice
 * and quarterly review cycles.
 */
export const charterAndCourseFramework: Framework = charterAndCourseJson as unknown as Framework
