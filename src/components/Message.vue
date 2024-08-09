<template>
    <div :class="['message-container', messageType]">
      <div class="avatar">
        <NAvatar>{{ avatar }}</NAvatar>
      </div>
      <div class="message-content">
        <!-- <div class="timestamp">{{ timestamp }}</div> -->
        <div class="message">{{ content }}</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    avatar: {
      type: String,
      required: true
    },
    timestamp: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    isUser: {
      type: Boolean,
      default: false
    },
    messageType: {
      type: String,
      default: ''
    }
  });
  </script>
  
  <style scoped>
  .message-container {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding: 8px;
    border-radius: 8px;
    gap:1.5rem;
  }
  
  .message-container.user {
    flex-direction: row-reverse;
    text-align: right;
  }
  
  .avatar img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin: 0 8px;
  }
  
  .message-content {
    max-width: 60%;
  }
  
  .timestamp {
    font-size: 12px;
    color: gray;
    margin-bottom: 4px;
  }
  
  .message {
    background-color: #f1f1f1;
    padding: 8px;
    border-radius: 8px;
    word-break: break-word;
  }
  
  .message-container.user .message {
    background-color: #e0f7fa;
  }
  </style>
  