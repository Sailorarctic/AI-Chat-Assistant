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
    if (!input.trim() || !selectedChat || !isPuterReady) return;

    const userMessage = { id: uuidv4(), role: 'user', content: input };
    const aiMessage = { id: uuidv4(), role: 'ai', content: '' };
    
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
      model: model === 'model1' ? 'claude-3-5-sonnet' : undefined,
    };

   try {
    const responseStream = await window.puter.ai.chat(input, options); // Assumes 'input' and 'options' variables are defined elsewhere
    let fullResponse = '';
    
    for await (const part of responseStream) {
        // 1. Accumulate the full response in the local variable (safe)
        fullResponse += part?.text || '';
        
        // 2. Capture the current full response and the message ID into stable, 
        //    block-scoped variables for the closure, fixing the ESLint error.
        const currentFullResponse = fullResponse; 
        const aiMessageId = aiMessage.id; 

        setSelectedChat(prevChat => {
            const newMessages = [...prevChat.messages];
            const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
            
            if (aiMsgIndex !== -1) {
                // The function now safely uses the stable currentFullResponse value.
                newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: currentFullResponse };
            }
            
            // Return the full new state object
            return { ...prevChat, messages: newMessages };
        });
    } // 🎯 Structural Fix: Closes the 'for await...of' loop

} catch (error) {
    // 🎯 Structural Fix: Adds the required 'catch' block for error handling
    console.error('Puter AI Streaming Error:', error);
} // 🎯 Structural Fix: Closes the 'try' block
    setSelectedChat(prevChat => {
        const newMessages = [...prevChat.messages];
        const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessageId);
        
        if (aiMsgIndex !== -1) {
            // The function now safely uses the stable currentFullResponse value.
            newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: currentFullResponse };
        }
        
        // Return the full new state object
        return { ...prevChat, messages: newMessages };
    });
}
        
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === selectedChat.id
              ? { ...chat, messages: [...selectedChat.messages.slice(0, -1), { ...aiMessage, content: fullResponse }] }
              : chat
          )
        );
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = 'Error: Unable to fetch response.';
      setSelectedChat(prevChat => {
        const newMessages = [...prevChat.messages];
        const aiMsgIndex = newMessages.findIndex(msg => msg.id === aiMessage.id);
        if (aiMsgIndex !== -1) {
          newMessages[aiMsgIndex] = { ...newMessages[aiMsgIndex], content: errorMessage };
        }
        return { ...prevChat, messages: newMessages };
      });
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === selectedChat.id
            ? { ...chat, messages: [...selectedChat.messages.slice(0, -1), { ...aiMessage, content: errorMessage }] }
            : chat
        )
      );
    } finally {
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
