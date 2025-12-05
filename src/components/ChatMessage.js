import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { motion } from 'framer-motion';

export default function ChatMessage({ message }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: isAssistant ? 'flex-start' : 'flex-end', 
          mb: 1,
          mx: { xs: 1, sm: 2 },
          position: 'relative',
        }}
      >
        <Box
          sx={{
            maxWidth: '75%',
            position: 'relative',
            backgroundColor: isAssistant ? '#f0f0f0' : '#0084ff', 
            color: isAssistant ? '#000' : '#fff', 
            borderRadius: '18px',
            px: 2,
            py: 1.5,
            fontSize: { xs: '0.9rem', sm: '1rem' },
            wordBreak: 'break-word',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              [isAssistant ? 'left' : 'right']: -8, 
              borderStyle: 'solid',
              borderWidth: '10px 0 0 10px',
              borderColor: `transparent transparent transparent ${isAssistant ? '#f0f0f0' : '#0084ff'}`, 
              transform: isAssistant ? 'none' : 'scaleX(-1)', 
            },
          }}
        >
          {message.content}
          <Tooltip title="Copy">
            <IconButton
              onClick={handleCopy}
              size="small"
              sx={{
                position: 'absolute',
                top: -20,
                right: 0,
                color: 'rgba(0,0,0,0.5)',
                padding: 0.5,
                opacity: 0,
                transition: '0.2s',
                '&:hover': { opacity: 1 },
              }}
            >
              <ContentCopy sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </motion.div>
  ); // <--- This is the FINAL closing return character
} // <--- This is the FINAL closing brace for the function
