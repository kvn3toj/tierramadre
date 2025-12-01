/**
 * Semantic Interactive Tokens
 * "Emerald iOS" Design System
 *
 * Interactive element states (hover, active, focus, disabled).
 * Optimized for both touch and mouse interactions.
 */

import { primitiveColors } from '../primitives/colors';

/**
 * Interactive States
 * Common interaction states for all interactive elements
 */
export const interactionStates = {
  /**
   * Hover State
   * Desktop/tablet hover effects
   */
  hover: {
    opacity: 0.9,
    transform: 'scale(1.02)',
  },

  /**
   * Active/Pressed State
   * Touch/click feedback
   */
  active: {
    opacity: 0.95,
    transform: 'scale(0.98)',
  },

  /**
   * Focus State
   * Keyboard navigation indicator
   */
  focus: {
    outline: {
      light: primitiveColors.emerald[500],
      dark: primitiveColors.emerald[400],
    },
    outlineWidth: '2px',
    outlineOffset: '2px',
    outlineStyle: 'solid' as const,
  },

  /**
   * Disabled State
   */
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
  },
} as const;

/**
 * Button States
 * Interactive states for buttons
 */
export const buttonStates = {
  /**
   * Primary Button (Filled)
   */
  primary: {
    default: {
      light: {
        background: primitiveColors.emerald[500],
        text: primitiveColors.surfaces.light.primary,
        border: 'transparent',
      },
      dark: {
        background: primitiveColors.emerald[400],
        text: primitiveColors.surfaces.dark.primary,
        border: 'transparent',
      },
    },
    hover: {
      light: {
        background: primitiveColors.emerald[600],
      },
      dark: {
        background: primitiveColors.emerald[300],
      },
    },
    active: {
      light: {
        background: primitiveColors.emerald[700],
      },
      dark: {
        background: primitiveColors.emerald[500],
      },
    },
  },

  /**
   * Secondary Button (Tinted)
   */
  secondary: {
    default: {
      light: {
        background: primitiveColors.emerald[50],
        text: primitiveColors.emerald[700],
        border: 'transparent',
      },
      dark: {
        background: primitiveColors.emerald[900],
        text: primitiveColors.emerald[300],
        border: 'transparent',
      },
    },
    hover: {
      light: {
        background: primitiveColors.emerald[100],
      },
      dark: {
        background: primitiveColors.emerald[800],
      },
    },
  },

  /**
   * Tertiary Button (Plain)
   */
  tertiary: {
    default: {
      light: {
        background: 'transparent',
        text: primitiveColors.emerald[500],
        border: 'transparent',
      },
      dark: {
        background: 'transparent',
        text: primitiveColors.emerald[400],
        border: 'transparent',
      },
    },
    hover: {
      light: {
        background: primitiveColors.emerald[50],
      },
      dark: {
        background: primitiveColors.emerald[900],
      },
    },
  },

  /**
   * Outlined Button
   */
  outlined: {
    default: {
      light: {
        background: 'transparent',
        text: primitiveColors.emerald[500],
        border: primitiveColors.emerald[500],
      },
      dark: {
        background: 'transparent',
        text: primitiveColors.emerald[400],
        border: primitiveColors.emerald[400],
      },
    },
    hover: {
      light: {
        background: primitiveColors.emerald[50],
      },
      dark: {
        background: primitiveColors.emerald[900],
      },
    },
  },

  /**
   * Destructive Button (Error)
   */
  destructive: {
    default: {
      light: {
        background: primitiveColors.system.red.light,
        text: primitiveColors.surfaces.light.primary,
        border: 'transparent',
      },
      dark: {
        background: primitiveColors.system.red.dark,
        text: primitiveColors.surfaces.dark.primary,
        border: 'transparent',
      },
    },
  },
} as const;

/**
 * Input States
 * Interactive states for text fields and inputs
 */
export const inputStates = {
  /**
   * Default State
   */
  default: {
    light: {
      background: primitiveColors.metallic.silver[100],
      text: primitiveColors.surfaces.dark.primary,
      border: primitiveColors.metallic.silver[200],
      placeholder: primitiveColors.metallic.silver[400],
    },
    dark: {
      background: primitiveColors.metallic.silver[900],
      text: primitiveColors.surfaces.light.primary,
      border: primitiveColors.metallic.silver[800],
      placeholder: primitiveColors.metallic.silver[600],
    },
  },

  /**
   * Focus State
   */
  focus: {
    light: {
      border: primitiveColors.emerald[500],
      background: primitiveColors.surfaces.light.primary,
    },
    dark: {
      border: primitiveColors.emerald[400],
      background: primitiveColors.surfaces.dark.secondary,
    },
  },

  /**
   * Error State
   */
  error: {
    light: {
      border: primitiveColors.system.red.light,
      background: primitiveColors.surfaces.light.primary,
    },
    dark: {
      border: primitiveColors.system.red.dark,
      background: primitiveColors.surfaces.dark.secondary,
    },
  },

  /**
   * Success State
   */
  success: {
    light: {
      border: primitiveColors.system.green.light,
    },
    dark: {
      border: primitiveColors.system.green.dark,
    },
  },
} as const;

/**
 * Card States
 * Interactive states for cards
 */
export const cardStates = {
  /**
   * Resting State
   */
  default: {
    light: {
      background: primitiveColors.surfaces.light.primary,
      border: primitiveColors.metallic.silver[200],
    },
    dark: {
      background: primitiveColors.surfaces.dark.secondary,
      border: primitiveColors.metallic.silver[800],
    },
  },

  /**
   * Hover State (Desktop)
   */
  hover: {
    light: {
      background: primitiveColors.surfaces.light.primary,
      border: primitiveColors.emerald[200],
    },
    dark: {
      background: primitiveColors.surfaces.dark.secondary,
      border: primitiveColors.emerald[800],
    },
  },

  /**
   * Active/Selected State
   */
  active: {
    light: {
      background: primitiveColors.emerald[50],
      border: primitiveColors.emerald[500],
    },
    dark: {
      background: primitiveColors.emerald[900],
      border: primitiveColors.emerald[400],
    },
  },
} as const;

/**
 * Toggle States
 * Interactive states for switches and toggles
 */
export const toggleStates = {
  /**
   * Off State
   */
  off: {
    light: {
      background: primitiveColors.metallic.silver[300],
      thumb: primitiveColors.surfaces.light.primary,
    },
    dark: {
      background: primitiveColors.metallic.silver[700],
      thumb: primitiveColors.surfaces.light.primary,
    },
  },

  /**
   * On State
   */
  on: {
    light: {
      background: primitiveColors.emerald[500],
      thumb: primitiveColors.surfaces.light.primary,
    },
    dark: {
      background: primitiveColors.emerald[400],
      thumb: primitiveColors.surfaces.dark.primary,
    },
  },
} as const;

/**
 * Selection States
 * For chips, radio buttons, checkboxes
 */
export const selectionStates = {
  /**
   * Unselected
   */
  unselected: {
    light: {
      background: primitiveColors.surfaces.light.secondary,
      text: primitiveColors.surfaces.dark.primary,
      border: primitiveColors.metallic.silver[300],
    },
    dark: {
      background: primitiveColors.surfaces.dark.tertiary,
      text: primitiveColors.surfaces.light.primary,
      border: primitiveColors.metallic.silver[700],
    },
  },

  /**
   * Selected
   */
  selected: {
    light: {
      background: primitiveColors.emerald[500],
      text: primitiveColors.surfaces.light.primary,
      border: primitiveColors.emerald[500],
    },
    dark: {
      background: primitiveColors.emerald[400],
      text: primitiveColors.surfaces.dark.primary,
      border: primitiveColors.emerald[400],
    },
  },
} as const;

/**
 * List Item States
 * For interactive list items
 */
export const listItemStates = {
  /**
   * Default State
   */
  default: {
    light: {
      background: 'transparent',
    },
    dark: {
      background: 'transparent',
    },
  },

  /**
   * Hover State
   */
  hover: {
    light: {
      background: primitiveColors.metallic.silver[100],
    },
    dark: {
      background: primitiveColors.metallic.silver[900],
    },
  },

  /**
   * Active/Pressed State
   */
  active: {
    light: {
      background: primitiveColors.metallic.silver[200],
    },
    dark: {
      background: primitiveColors.metallic.silver[800],
    },
  },

  /**
   * Selected State
   */
  selected: {
    light: {
      background: primitiveColors.emerald[50],
    },
    dark: {
      background: primitiveColors.emerald[900],
    },
  },
} as const;

/**
 * Combined Interactive Semantic Tokens
 */
export const interactive = {
  states: interactionStates,
  button: buttonStates,
  input: inputStates,
  card: cardStates,
  toggle: toggleStates,
  selection: selectionStates,
  listItem: listItemStates,
} as const;

export type Interactive = typeof interactive;
