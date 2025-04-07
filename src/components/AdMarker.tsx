import React from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { formatTime } from '../utils/formatTime';

interface AdSegment {
  start: number;
  end: number;
  text: string;
}

interface AdMarkerProps {
  adSegments: AdSegment[];
  onTimestampClick: (timestamp: number) => void;
}

export const AdMarker: React.FC<AdMarkerProps> = ({ adSegments, onTimestampClick }) => {
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="subtitle2" color="error" gutterBottom>
        Ad Segments Found
      </Typography>
      
      {adSegments.map((segment, index) => (
        <Box key={index} sx={{ mb: index !== adSegments.length - 1 ? 2 : 0 }}>
          <Typography variant="body2" gutterBottom>
            {segment.text}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onTimestampClick(segment.start)}
              startIcon={<SkipNextIcon />}
            >
              Skip to {formatTime(segment.start)}
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              Duration: {formatTime(segment.end - segment.start)}
            </Typography>
          </Box>
        </Box>
      ))}
    </Paper>
  );
}; 