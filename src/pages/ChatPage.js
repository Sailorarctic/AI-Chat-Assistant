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
    // Check for necessary components and input
    if (!input.trim() || !selectedChat || !isPuterReady) return;

    // 1. Define messages, ensuring the AI role is 'assistant' for API compatibility
    const userMessage = { id: uuidv4(), role: 'user', content: input };
    const aiMessage = { id: uuidv4(), role: 'assistant', content: '' }; 
    
    // 2. Create the clean history array for the API call
    //    We filter to ensure only valid 'user' and 'assistant' roles are sent.
    const cleanHistory = selectedChat.messages.filter(msg => 
        (msg.role === 'user' || msg.role === 'assistant') && msg.content.trim().length > 0
    );

    // Final array for the API: Clean History + New User Message
    const historyForAPI = [...cleanHistory, userMessage];

    // 3. Update local state with the new user message and the blank aiMessage (for streaming display)
    const updatedChat = {
        ...selectedChat,
        messages: [...selectedChat.messages, userMessage, aiMessage],
    };
    
    setChats(prevChats => 
        prevChats.map(chat => 
            chat.id === selectedChat.id ? updatedChat : chat
        )
    );
    setSelectedChat(updatedChat);
    setInput('');
    setLoading(true);

    const options = {
        stream: true,
        model: "claude-sonnet-4-5", 
    };

    let fullResponse = '';
    const aiMessageId = aiMessage.id;
    const errorMessage = 'Error: Unable to fetch response.';

    try {
        // 4. Send the clean history to the API
        const responseStream = await window.puter.ai.chat(historyForAPI, options);
        
        for await (const part of responseStream) {
            fullResponse += part?.text || '';
            const currentFullResponse = fullResponse;
            
            // Streaming update logic
            setSelectedChat(prevChat => {
                const newMessages = [...prevChat.messages];
                const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
                
                if (aiMsgIndex !== -1) {
                    newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: currentFullResponse };
                }
                return { ...prevChat, messages: newMessages };
            });
        }
        
        // Final Success State Update
        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === selectedChat.id
                    ? { ...chat, messages: [...cleanHistory, userMessage, { ...aiMessage, content: fullResponse }] }
                    : chat
            )
        );

    } catch (error) {
        console.error('Puter API Fetch Error:', error);
        
        // Error handling logic
        setSelectedChat(prevChat => {
            const newMessages = [...prevChat.messages];
            const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
            if (aiMsgIndex !== -1) {
                newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], role: 'assistant', content: errorMessage };
            }
            return { ...prevChat, messages: newMessages };
        });

        setChats(prevChats =>
            prevChats.map(chat =>
                chat.id === selectedChat.id
                    ? { ...chat, messages: [...selectedChat.messages.slice(0, -1), { ...aiMessage, role: 'assistant', content: errorMessage }] }
                    : chat
            )
        );
        
    } finally {
        setLoading(false);
        // We need to trigger the style fix here for the blue bubbles!
        // You'll need to update src/components/ChatMessage.js to check for 'assistant'
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
