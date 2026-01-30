// Profile Editor form state hook

import { useState, useCallback } from 'react';
import { AmbassadorProfile, ContactMethod, ColorScheme } from '../../../types/ambassador';
import { TemplateType, SaveStatus } from './types';

export function useProfileForm(ambassador: AmbassadorProfile, onSave: (profile: AmbassadorProfile) => void) {
  // Form state
  const [formData, setFormData] = useState<AmbassadorProfile>({ ...ambassador });
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Update form field
  const updateField = useCallback(<K extends keyof AmbassadorProfile>(
    field: K,
    value: AmbassadorProfile[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  // Update nested field
  const updateNestedField = useCallback(<K extends keyof AmbassadorProfile>(
    parentField: K,
    childField: string,
    value: unknown
  ) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as object),
        [childField]: value,
      },
    }));
    setHasChanges(true);
  }, []);

  // Handle contact method changes
  const updateContactMethod = useCallback((index: number, field: keyof ContactMethod, value: unknown) => {
    setFormData(prev => {
      const contacts = [...prev.contactMethods];
      contacts[index] = { ...contacts[index], [field]: value };
      return { ...prev, contactMethods: contacts };
    });
    setHasChanges(true);
  }, []);

  const addContactMethod = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      contactMethods: [
        ...prev.contactMethods,
        { type: 'whatsapp', value: '', primary: false, verified: false },
      ],
    }));
    setHasChanges(true);
  }, []);

  const removeContactMethod = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      contactMethods: prev.contactMethods.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  // Handle specialty changes
  const addSpecialty = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      specialties: [
        ...prev.specialties,
        { name: '', description: '', yearsExperience: 0 },
      ],
    }));
    setHasChanges(true);
  }, []);

  const updateSpecialty = useCallback((index: number, field: string, value: unknown) => {
    setFormData(prev => {
      const specialties = [...prev.specialties];
      specialties[index] = { ...specialties[index], [field]: value };
      return { ...prev, specialties };
    });
    setHasChanges(true);
  }, []);

  const removeSpecialty = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  // Handle template type change
  const setTemplateType = useCallback((type: TemplateType) => {
    updateNestedField('template', 'type', type);
  }, [updateNestedField]);

  // Handle color scheme change
  const setColorScheme = useCallback((scheme: ColorScheme) => {
    updateNestedField('template', 'colorScheme', scheme);
  }, [updateNestedField]);

  // Handle save
  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      onSave(formData);
      setSaveStatus('saved');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [formData, onSave]);

  return {
    formData,
    hasChanges,
    saveStatus,
    updateField,
    updateNestedField,
    updateContactMethod,
    addContactMethod,
    removeContactMethod,
    addSpecialty,
    updateSpecialty,
    removeSpecialty,
    setTemplateType,
    setColorScheme,
    handleSave,
  };
}
