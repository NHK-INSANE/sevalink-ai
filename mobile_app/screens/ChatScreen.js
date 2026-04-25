import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = "https://sevalink-backend-bmre.onrender.com";
const socket = io(API_BASE);

export default function ChatScreen({ route }) {
  const { userId, userName } = route.params || { userId: 'demo', userName: 'Responder' };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef();

  useEffect(() => {
    socket.emit('register-user', userId);
    socket.on('chat_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      checkSmartTrigger(msg.text);
    });
    return () => socket.off('chat_message');
  }, []);

  const checkSmartTrigger = (text) => {
    const triggerWords = ["help", "injured", "arrived", "critical"];
    if (triggerWords.some(w => text.toLowerCase().includes(w))) {
      triggerAICopilot();
    }
  };

  const triggerAICopilot = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/ai/copilot`, {
        messages: messages.slice(-5),
        report: { title: "Mobile Ops", urgency: "High" }
      });
      const aiReply = {
        _id: Math.random().toString(),
        text: res.data.reply,
        senderName: "AI COMMAND",
        isAI: true,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      text: inputText,
      senderId: userId,
      senderName: userName,
      createdAt: new Date()
    };
    // socket.emit('send_message', newMsg); // handled by backend in real app
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    checkSmartTrigger(newMsg.text);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0b0f1a]"
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item._id || Math.random().toString()}
        renderItem={({ item }) => (
          <View className={`p-4 m-2 rounded-2xl max-w-[80%] ${item.isAI ? "bg-sky-500 self-start" : item.senderId === userId ? "bg-indigo-600 self-end" : "bg-slate-800 self-start"}`}>
            {item.isAI && <Text className="text-[10px] font-bold text-sky-100 mb-1">AI CO-PILOT</Text>}
            <Text className="text-white text-md">{item.text}</Text>
          </View>
        )}
        onContentSizeChange={() => flatListRef.current.scrollToEnd()}
      />
      <View className="p-4 border-t border-white/10 flex-row gap-2">
        <TextInput
          className="flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 border border-white/5"
          value={inputText}
          onChangeText={setInputText}
          placeholder="Secure transmission..."
          placeholderTextColor="#666"
        />
        <TouchableOpacity 
          onPress={sendMessage}
          className="bg-indigo-600 p-4 rounded-xl"
        >
          <Text className="text-white font-bold">SEND</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
