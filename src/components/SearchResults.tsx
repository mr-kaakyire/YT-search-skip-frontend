import React, { useMemo } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
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
  const filteredResults = useMemo(() => {
    if (!searchQuery) return [];

    const query = searchQuery.toLowerCase();
    const results: (TranscriptSegment & { context: string })[] = [];
    const contextSize = 2; // Number of segments before and after for context

    transcript.forEach((segment, index) => {
      if (segment.text.toLowerCase().includes(query)) {
        // Get surrounding segments for context
        const start = Math.max(0, index - contextSize);
        const end = Math.min(transcript.length - 1, index + contextSize);
        
        const contextSegments = transcript.slice(start, end + 1);
        const context = contextSegments.map(s => s.text).join(' ');

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
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        maxHeight: 400,
        overflow: 'auto'
      }}
    >
      <List disablePadding>
        {filteredResults.map((result, index) => {
          const highlightedText = result.context.replace(
            new RegExp(searchQuery, 'gi'),
            match => `<mark>${match}</mark>`
          );

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
                onClick={() => onTimestampClick(result.offset)}
                sx={{ alignSelf: 'flex-end' }}
              >
                Jump to {formatTime(result.offset)}
              </Button>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}; 