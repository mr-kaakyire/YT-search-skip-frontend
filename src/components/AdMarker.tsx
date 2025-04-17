import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import { formatTime } from '../utils/formatTime';

interface AdSegment {
  start: number;
  end: number;
  text: string;
}

interface AdMarkerProps {
  adSegments: AdSegment[];
  onTimestampClick: (timestamp: number) => void;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export const AdMarker: React.FC<AdMarkerProps> = ({ 
  adSegments, 
  onTimestampClick,
  isExpanded,
  onExpandToggle
}) => {
  const [localExpanded, setLocalExpanded] = useState(true);
  
  // Use either the provided isExpanded or fall back to local state
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;
  
  const toggleExpanded = () => {
    if (onExpandToggle) {
      // If external control is provided, use that
      onExpandToggle();
    } else {
      // Otherwise use local state
      setLocalExpanded(!localExpanded);
    }
  };

  // Calculate total ad time
  const totalAdTime = adSegments.reduce((total, segment) => {
    return total + (segment.end - segment.start);
  }, 0);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          p: 2,
          transition: 'background-color 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
          }
        }}
        onClick={toggleExpanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: "0.8rem" }}>
          <Typography variant="subtitle2" color="error" sx={{ mr: 1 }}>
            Ad Segments
          </Typography>
          <Badge 
            badgeContent={adSegments.length} 
            color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title={expanded ? "Collapse" : "Expand"}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
              {formatTime(totalAdTime)} total
            </Typography>
          </Tooltip>
          {expanded ? 
            <KeyboardArrowUpIcon fontSize="small" color="action" /> : 
            <KeyboardArrowDownIcon fontSize="small" color="action" />
          }
        </Box>
      </Box>
      
      {expanded && <Divider />}
      
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2, pt: 1 }}>
          {adSegments.map((segment, index) => (
            <Box key={index} sx={{ 
              mb: index !== adSegments.length - 1 ? 2 : 0,
              pt: 1 
            }}>
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
        </Box>
      </Collapse>
    </Paper>
  );
}; 