export type BubbleType = 'content' | 'quiz' | 'flashcard' | 'iow' | 'summary' | 'help';

export interface QuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctAnswer: number;
}

export interface IOWEntry {
  id: string;
  question: string;
  answer: string;
}

export interface FlashcardEntry {
  id: string;
  front: string;
  back: string;
  category: string;
}

export interface Bubble {
  id: string;
  type: BubbleType;
  parentId: string; // content bubble or milestone id
  title?: string;
  content?: string;
  order: number;
  // Quiz-specific data
  quizzes?: QuizQuestion[];
  // IOW-specific data
  iowEntries?: IOWEntry[];
  // Flashcard-specific data
  flashcards?: FlashcardEntry[];
  // Summary-specific data
  summaryData?: SummaryData;
}

export interface SummaryData {
  title: string;
  content: string;
}

export interface ContentBubble extends Bubble {
  type: 'content';
  title: string;
  content: string | null;
  nextTopic?: string;
  interactions: Bubble[];
  summary?: SummaryData;
  userTopicInput?: string;    // User's custom topic/context
  suggestedTopic?: string;     // AI-suggested topic shown to user
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  firstTopic?: string;
  order: number;
  isExpanded: boolean;
  contentBubbles: ContentBubble[];
  milestoneStatus?: 'locked' | 'active' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  isCustomRequest?: boolean;
  customTopicRequest?: string;
}

export interface ProgressionContext {
  recommendedTopicSequence?: string[];
  difficultyProgression?: string;
  keyLearningObjectives?: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  goal: string;
  context?: string;
  curriculum?: string;
  currentMilestoneIndex?: number;
  progressionContext?: ProgressionContext;
  createdAt: Date;
  updatedAt: Date;
  milestones: Milestone[];
}

export interface User {
  id: string;
  email: string;
  name: string;
}

// Feedback types
export type FeedbackType = 'bug' | 'feature' | 'general';

export interface Feedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  description?: string;
  user_agent?: string;
  screen_size?: string;
  url?: string;
  created_at: string;
}

export const FEEDBACK_TYPE_CONFIG: Record<FeedbackType, { label: string; description: string }> = {
  bug: {
    label: 'Bug Report',
    description: 'Report an issue or problem',
  },
  feature: {
    label: 'Feature Request',
    description: 'Suggest a new feature',
  },
  general: {
    label: 'General Feedback',
    description: 'Share your thoughts',
  },
};

// Progress tracking interfaces
export interface QuizAttempt {
  id: string;
  quizQuestionId: string;
  userId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  attemptedAt: Date;
}

export interface ContentBubbleCompletion {
  contentBubbleId: string;
  userId: string;
  completedAt: Date;
}

export interface IOWCompletion {
  id: string;
  iowEntryId: string;
  userId: string;
  completedAt: Date;
  answerQualityScore?: number;
}

// Generated AI summary for a content bubble (structured format)
export interface GeneratedBubbleSummary {
  contentBubbleId?: string;
  title?: string;
  quizSummary: string | null;
  flashcardSummary: string | null;
  iowSummary: string | null;
  overallSummary: string;
}

export const BUBBLE_CONFIG = {
  content: {
    label: 'C',
    name: 'Content',
    color: 'bubble-content',
    description: 'Knowledge to absorb',
  },
  quiz: {
    label: 'Q',
    name: 'Quiz',
    color: 'bubble-quiz',
    description: 'Test your understanding',
  },
  flashcard: {
    label: 'F',
    name: 'Flashcard',
    color: 'bubble-flashcard',
    description: 'Create study cards',
  },
  iow: {
    label: 'iow',
    name: 'In Own Words',
    color: 'bubble-iow',
    description: 'Explain concepts yourself',
  },
  summary: {
    label: 'S',
    name: 'Summary',
    color: 'bubble-summary',
    description: 'Key takeaways',
  },
  help: {
    label: '?',
    name: 'Help',
    color: 'bubble-help',
    description: 'Get assistance',
  },
} as const;
