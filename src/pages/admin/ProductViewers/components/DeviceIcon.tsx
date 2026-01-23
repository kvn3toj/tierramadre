/**
 * DeviceIcon Component
 * Renders appropriate icon based on device type.
 */

import React from 'react';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

interface DeviceIconProps {
  device: string;
  size?: number;
}

export const DeviceIcon: React.FC<DeviceIconProps> = ({ device, size = 16 }) => {
  const deviceLower = device.toLowerCase();
  if (deviceLower === 'mobile') return <Smartphone size={size} />;
  if (deviceLower === 'tablet') return <Tablet size={size} />;
  return <Monitor size={size} />;
};
