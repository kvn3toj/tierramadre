// Profile Editor shared types

import { AmbassadorProfile, ContactMethod, ColorScheme } from '../../../types/ambassador';

export type TemplateType = 'tm-official' | 'self-brand';

export type EditorTab = 'basic' | 'contact' | 'template' | 'specialties';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ProfileEditorProps {
  ambassador: AmbassadorProfile;
  onSave: (profile: AmbassadorProfile) => void;
  onPreview?: () => void;
  onCancel?: () => void;
}

export interface BasicTabProps {
  formData: AmbassadorProfile;
  updateField: <K extends keyof AmbassadorProfile>(field: K, value: AmbassadorProfile[K]) => void;
  updateNestedField: <K extends keyof AmbassadorProfile>(parent: K, child: string, value: unknown) => void;
  isLight: boolean;
}

export interface ContactTabProps {
  formData: AmbassadorProfile;
  updateContactMethod: (index: number, field: keyof ContactMethod, value: unknown) => void;
  addContactMethod: () => void;
  removeContactMethod: (index: number) => void;
  isLight: boolean;
}

export interface TemplateTabProps {
  formData: AmbassadorProfile;
  setTemplateType: (type: TemplateType) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  updateNestedField: <K extends keyof AmbassadorProfile>(parent: K, child: string, value: unknown) => void;
  isLight: boolean;
}

export interface SpecialtiesTabProps {
  formData: AmbassadorProfile;
  addSpecialty: () => void;
  updateSpecialty: (index: number, field: string, value: unknown) => void;
  removeSpecialty: (index: number) => void;
  isLight: boolean;
}
