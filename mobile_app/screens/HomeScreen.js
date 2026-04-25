import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView className="flex-1 bg-[#0b0f1a] p-6">
      <View className="mb-10 mt-10">
        <Text className="text-4xl font-black text-white tracking-widest">SEVALINK</Text>
        <Text className="text-indigo-400 font-bold tracking-[0.4em]">COMMAND UNIT</Text>
      </View>

      <View className="gap-4">
        <TouchableOpacity 
          onPress={() => navigation.navigate('Map')}
          className="bg-indigo-600/20 border border-indigo-500/30 p-8 rounded-3xl"
        >
          <Text className="text-2xl font-bold text-white mb-2">Tactical Map</Text>
          <Text className="text-indigo-400 text-xs font-bold uppercase tracking-widest">View Active Responders</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('Chat')}
          className="bg-sky-600/20 border border-sky-500/30 p-8 rounded-3xl"
        >
          <Text className="text-2xl font-bold text-white mb-2">Secure Comms</Text>
          <Text className="text-sky-400 text-xs font-bold uppercase tracking-widest">AI-Integrated Messaging</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="bg-red-600/20 border border-red-500/30 p-8 rounded-3xl"
        >
          <Text className="text-2xl font-bold text-white mb-2">🚨 SOS Signal</Text>
          <Text className="text-red-400 text-xs font-bold uppercase tracking-widest">Immediate Broadcast</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-20 items-center">
        <Text className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">System Status: Operational</Text>
      </View>
    </ScrollView>
  );
}
