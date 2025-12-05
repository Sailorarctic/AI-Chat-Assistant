import React, { useState, useEffect, useRef } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import styled from '@emotion/styled';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import Header from '../components/Header';

const ChatContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: '20px 0',
  gap: 8,
  marginBottom: '80px',
  height: 'calc(100vh - 180px)',
  [theme.breakpoints.down('sm')]: {
    height: 'calc(100vh - 160px)',
  },
}));

const ChatPage = () => {
  const initialChat = {
    id: uuidv4(),
    title: 'New Chat 1',
    messages: [],
  };

  const [chats, setChats] = useState([initialChat]);
  const [selectedChat, setSelectedChat] = useState(initialChat);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('model1');
  const [enterKeyBehavior, setEnterKeyBehavior] = useState('send');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPuterReady, setIsPuterReady] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat?.messages]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    
    script.onload = () => {
      // Wait for window.puter to be available
      const checkPuter = setInterval(() => {
        if (window.puter) {
          setIsPuterReady(true);
          clearInterval(checkPuter);
        }
      }, 100);
    };
    
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleNewChat = () => {
    const newChat = {
      id: uuidv4(),
      title: `New Chat ${chats.length + 1}`,
      messages: [],
    };
    setChats([...chats, newChat]);
    setSelectedChat(newChat);
  };

  const handleRenameChat = (chatId, newTitle) => {
    setChats(
      chats.map((chat) =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    );
  };

  const handleDeleteChat = (chatId) => {
    setChats(chats.filter((chat) => chat.id !== chatId));
    if (selectedChat?.id === chatId) {
      setSelectedChat(chats[0] || null);
    }
  };

  const handleSend = async () => {
    // 1. Initial Checks
    if (!input.trim() || !selectedChat || !isPuterReady) return;

    // Define messages and initial state update
    const userMessage = { id: uuidv4(), role: 'user', content: input };
    // Start with a blank AI message
    const aiMessage = { id: uuidv4(), role: 'ai', content: '' };
    
    const updatedChat = {
        ...selectedChat,
        messages: [...selectedChat.messages, userMessage, aiMessage],
    };
    
    // Update local state and global chats immediately
    setChats(prevChats => 
        prevChats.map(chat => 
            chat.id === selectedChat.id ? updatedChat : chat
        )
    );
    setSelectedChat(updatedChat);
    setInput('');
    setLoading(true);

    // 2. Define Model and Options
    const messagesToSend = selectedChat.messages.length > 0
        ? [...selectedChat.messages, userMessage]
        : [userMessage]; // Start conversation history with the new message
        
    const options = {
        stream: true,
        // 🎯 MODEL UPDATE: Using a powerful, modern model as requested
        model: "claude-sonnet-4.5", 
    };

    let fullResponse = '';
    const aiMessageId = aiMessage.id;
    const errorMessage = 'Error: Unable to fetch response.';

    try {
        // 3. Start Streaming
        const responseStream = await window.puter.ai.chat(messagesToSend, options);
        
        for await (const part of responseStream) {
            fullResponse += part?.text || '';
            
            // 🎯 ESLINT FIX: Safely update the state with the current accumulated response
            const currentFullResponse = fullResponse;
            
            setSelectedChat(prevChat => {
                const newMessages = [...prevChat.messages];
                const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
                
                if (aiMsgIndex !== -1) {
                    newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: currentFullResponse };
                }
                
                return { ...prevChat, messages: newMessages };
            });
        }
        
        // 4. Final Success State Update (Sets the final, non-streaming message in the full chat list)
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === selectedChat.id
                    ? { ...chat, messages: [...selectedChat.messages, userMessage, { ...aiMessage, content: fullResponse }] }
                    : chat
            )
        );

    } catch (error) {
        // 5. Error Handling
        console.error('Puter AI Streaming Error:', error);
        
        // Update selected chat with error message
        setSelectedChat(prevChat => {
            const newMessages = [...prevChat.messages];
            const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
            if (aiMsgIndex !== -1) {
                newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: errorMessage };
            }
            return { ...prevChat, messages: newMessages };
        });

        // Update global chat list with error message
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === selectedChat.id
                    ? { ...chat, messages: [...selectedChat.messages.slice(0, -1), { ...aiMessage, content: errorMessage }] }
                    : chat
            )
        );
        
    } finally {
        // 6. Final Cleanup
        setLoading(false);
        scrollToBottom();
    }
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#343541',
      }}
    >
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Box sx={{ display: 'flex', flex: 1, position: 'relative' }}>
        <Sidebar
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
        <ChatContainer>
          {selectedChat?.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </ChatContainer>
      </Box>
      <ChatInput
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onSend={handleSend}
        disabled={loading || !selectedChat || !isPuterReady}
        model={model}
        onModelChange={(e) => setModel(e.target.value)}
        enterKeyBehavior={enterKeyBehavior}
        onEnterKeyBehaviorChange={(e) => setEnterKeyBehavior(e.target.value)}
      />
    </Box>
  );
};

export default ChatPage;
