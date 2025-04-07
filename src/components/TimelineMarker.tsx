import { useEffect } from 'react';
import { AdSegment } from '../utils/useVideoData';

interface TimelineMarkerProps {
  adSegments: AdSegment[];
}

// This component is now deprecated as markers are injected directly from App.tsx
export const TimelineMarker = ({ adSegments }: TimelineMarkerProps) => {
  // No operation - we're now injecting the markers directly from App.tsx
  return null;
}; 