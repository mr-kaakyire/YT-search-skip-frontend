import React, { useMemo, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Badge from '@mui/material/Badge';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { formatTime } from '../utils/formatTime';

interface TranscriptSegment {
  text: string;
  offset: number;
}

interface SearchResultsProps {
  transcript: TranscriptSegment[];
  searchQuery: string;
  onTimestampClick: (timestamp: number) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  transcript,
  searchQuery,
  onTimestampClick,
}) => {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) return [];

    const query = searchQuery.toLowerCase();
    const results: (TranscriptSegment & { context: string })[] = [];
    const contextSize = 2; // Number of segments before and after for context

    transcript.forEach((segment, index) => {
      if (segment && segment.text && typeof segment.text === 'string' && segment.text.toLowerCase().includes(query)) {
        // Get surrounding segments for context
        const start = Math.max(0, index - contextSize);
        const end = Math.min(transcript.length - 1, index + contextSize);
        
        const contextSegments = transcript.slice(start, end + 1);
        const context = contextSegments.map(s => s && s.text ? s.text : '').join(' ');

        results.push({
          ...segment,
          context
        });
      }
    });

    return results;
  }, [transcript, searchQuery]);

  if (!searchQuery) {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          Enter a search term to find specific moments in the video
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mt: 2,
          bgcolor: 'action.hover',
          borderRadius: 1,
          py: 1,
          px: 2
        }}>
          <KeyboardIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 'bold' }}>Ctrl+Q</Box> to open extension
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (filteredResults.length === 0) {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Typography variant="body2" color="text.secondary" align="center">
          No results found for "{searchQuery}"
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mt: 2,
          bgcolor: 'action.hover',
          borderRadius: 1,
          py: 1,
          px: 2
        }}>
          <KeyboardIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 'bold' }}>Ctrl+Q</Box> to open extension
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
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
        <Box sx={{ display: 'flex', gap:"0.8rem", alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            Search Results
          </Typography>
          <Badge 
            badgeContent={filteredResults.length} 
            color="primary"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
          />
        </Box>
        
        {expanded ? 
          <KeyboardArrowUpIcon fontSize="small" color="action" /> : 
          <KeyboardArrowDownIcon fontSize="small" color="action" />
        }
      </Box>
      
      {expanded && <Divider />}
      
      <Collapse in={expanded} timeout="auto">
        <List 
          disablePadding
          sx={{ 
            maxHeight: 400,
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)',
              }
            }
          }}
        >
          {filteredResults.map((result, index) => {
            const highlightedText = result.context && typeof result.context === 'string' 
              ? result.context.replace(
                  new RegExp(searchQuery, 'gi'),
                  match => `<mark>${match}</mark>`
                )
              : '';

            return (
              <ListItem 
                key={index}
                divider={index !== filteredResults.length - 1}
                sx={{ flexDirection: 'column', alignItems: 'flex-start' }}
              >
                <Box sx={{ width: '100%', mb: 1 }}>
                  <ListItemText
                    primary={
                      <div dangerouslySetInnerHTML={{ __html: highlightedText }} />
                    }
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: {
                        '& mark': {
                          bgcolor: 'warning.light',
                          color: 'warning.contrastText',
                          borderRadius: 0.5,
                          px: 0.5,
                        },
                      },
                    }}
                  />
                </Box>
                
                <Button
                  size="small"
                  variant="text"
                  onClick={() => result.offset !== undefined ? onTimestampClick(result.offset) : null}
                  sx={{ alignSelf: 'flex-end' }}
                >
                  Jump to {formatTime(result.offset || 0)}
                </Button>
              </ListItem>
            );
          })}
        </List>
        <Divider />
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 1,
          px: 2,
          bgcolor: 'action.hover',
        }}>
          <KeyboardIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Press <Box component="span" sx={{ fontWeight: 'bold' }}>Ctrl+Q</Box> to open extension
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}; 