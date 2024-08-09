<template>
    <div class="flex h100">
        <div class="live2d-container">
            <Live2D ref="live2d" model="/models/histoire/model.json" :cubism="2" :scale=".4"/>
        </div>
        <div class="sidebar container">
            <div class="api-key-container">
                <NInput v-model:value="apiKey" placeholder="Enter your OpenAI API key" type="password"
                    show-password-on="mousedown" @blur="saveApiKey" />
            </div>
            <NSelect v-model:value="selectedModel" :options="modelOptions" placeholder="Select ChatGPT model" />
        </div>

        <div class="chat-container">
            <div class="chat-history" ref="chatHistoryContainer">
                <h2>Chat History</h2>
                <div v-for="(entry, index) in chatHistory" :key="index">
                    <Message :avatar="entry.isUser ? userAvatar : gptAvatar" :timestamp="entry.timestamp"
                        :content="entry.content" :isUser="entry.isUser" :messageType="entry.isUser ? 'user' : ''" />
                </div>
                <!-- Display current GPT response -->
                <Message v-if="currentResponse" :avatar="gptAvatar" :timestamp="getCurrentTimestamp()"
                    :content="currentResponse" :isUser="false" />
            </div>
            <div class="chat-input">
                <NInput type="textarea" v-model:value="userInput" placeholder="Type your question here..."
                    @keydown="handleKeyDown" />
                <NButton @click="handleSubmit" type="primary">发送</NButton>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick ,defineEmits} from 'vue';

const apiKey = ref('');
const selectedModel = ref('gpt-3.5-turbo'); // 默认模型
const userInput = ref('');
const chatHistoryContainer = ref(null);
const live2d = ref(null)

// 默认头像
const userAvatar = 'User';
const gptAvatar = 'GPT';

// 获取当前时间的函数
const getCurrentTimestamp = () => new Date().toLocaleString();

// 默认聊天记录
const chatHistory = ref([
    {
        content: 'Hi there! How can I assist you today?',
        timestamp: getCurrentTimestamp(),
        isUser: false,
    },
]);

// 当前 GPT 回复
const currentResponse = ref('');

// 模型选项
const modelOptions = [
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
];

// 语音播放缓冲区
const speakBuffer = ref([]);
const speakText = ref('');

// 处理消息提交
const handleSubmit = async () => {
    const prompt = userInput.value.trim();
    if (prompt === '') return;

    const timestamp = getCurrentTimestamp();

    // 添加用户消息到聊天记录
    chatHistory.value.push({
        content: prompt,
        timestamp: timestamp,
        isUser: true,
    });

    // 清空当前 GPT 回复
    currentResponse.value = '';

    // 发送请求到 ChatGPT API
    await getChatGPTResponse(prompt, selectedModel.value, timestamp);

    // 清空用户输入
    userInput.value = '';
};

// 处理键盘事件
const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 阻止换行
        handleSubmit(); // 发送消息
    }
};

// 使用 fetch API 获取 ChatGPT 响应并实时更新聊天记录
const getChatGPTResponse = async (prompt, model, timestamp) => {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.value}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                stream: true,
            }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 处理流数据
        const processStream = () => {
            reader.read().then(({ done, value }) => {
                if (done) {
                    console.log('Stream completed');
                    if (currentResponse.value) {
                        chatHistory.value.push({
                            content: currentResponse.value,
                            timestamp: getCurrentTimestamp(),
                            isUser: false,
                        });
                        currentResponse.value = '';
                        saveChatHistory();
                    }
                    return;
                }

                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                // Process each chunk
                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        if (line === 'data: [DONE]') {
                            // Stream ended
                            if (currentResponse.value) {
                                chatHistory.value.push({
                                    content: currentResponse.value,
                                    timestamp: getCurrentTimestamp(),
                                    isUser: false,
                                });
                                currentResponse.value = '';
                                saveChatHistory();
                            }
                        } else {
                            try {
                                const json = JSON.parse(line.substring(6).trim());
                                if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                                    const content = json.choices[0].delta.content;
                                    currentResponse.value += content;
                                    speakText.value += content;
                                    console.log('Speak:', speakText.value,'是否句子完整',isCompleteSentence(speakText.value))
                                    if (isCompleteSentence(speakText.value)) {
                                        processText(speakText.value.trim())
                                        speakFromTextBuffer();  // 开始朗读
                                    }
                                    scrollToBottom();   // 滚动到底部
                                }
                            } catch (err) {
                                console.error('Error parsing JSON:', err);
                            }
                        }
                    }
                });

                processStream();
            }).catch(error => {
                console.error('Stream reading error:', error);
            });
        };

        processStream();

    } catch (error) {
        console.error('Error fetching ChatGPT response:', error);
        chatHistory.value.push({
            content: 'Sorry, something went wrong.',
            timestamp: getCurrentTimestamp(),
            isUser: false,
        });
        saveChatHistory();
    }
};

const processText = (text) => {
    // 使用正则表达式按标点符号分割文本
    const sentenceEndPattern = /([。！？\.\?!])(\s|$)/;
    const sentences = text.split(sentenceEndPattern).filter(Boolean);

    // 处理分割后的每个句子
    if (sentences.length > 1) {
        for (let i = 0; i < sentences.length - 1; i++) {
            // 将每个完整句子添加到 speakBuffer 中
            speakBuffer.value.push(sentences[i].trim() + sentences[i + 1].trim());
        }
        // 将最后剩余的文本赋值给 speakText
        speakText.value = sentences[sentences.length - 1].trim();
    } else {
        // 如果没有找到标点符号，将整个文本赋值给 speakText
        speakText.value = text;
    }
};

const isCompleteSentence = (text) => {
    // 正则表达式匹配句子结束的标点符号
    const sentenceEndPattern = /[。！？！？\.\?!]/;
    // 检查文本是否包含句子结束的标点符号
    const match = text.match(sentenceEndPattern);
    return match !== null;
};
// 是否正在播报
const isSpeaking = ref(false);
// 语音播报函数
const speakFromTextBuffer = () => {
    console.log('语音朗读',speakBuffer.value)
    if (speakBuffer.value.length > 0) {
        if (isSpeaking.value) return;
        const text = speakBuffer.value.shift();
        // 处理文本，移除标点符号
        const cleanText = text.replace(/[.,!?]/g, '').trim();
        // 如果文本为空，则不播报
        if (!cleanText) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // 设置语言为中文，根据需要可以更改
        utterance.rate = 1; // 语速
        utterance.pitch = 1; // 音调
        utterance.volume = 1; // 音量
        // 监听语音合成开始事件
        utterance.onstart = () => {
            live2d.value.startMotion('talk');
            console.log('Speech synthesis started.');
        };
        // 监听语音合成结束事件
        utterance.onend = () => {
            console.log('Speech synthesis ended.');
            // 语音合成结束后，可以继续播报缓冲区中的下一个句子
            isSpeaking.value = false;
            // 语音合成结束后，可以继续播报缓冲区中的下一个句子
            speakFromTextBuffer();
        };
        window.speechSynthesis.speak(utterance);
        isSpeaking.value = true;
    } else {
        isSpeaking.value = false;
    }
};
// 语音播报函数
const speakFromText = (text) => {
    // 处理文本，移除标点符号
    const cleanText = text.replace(/[.,!?]/g, '').trim();

    // 如果文本为空，则不播报
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; // 设置语言为中文，根据需要可以更改
    utterance.rate = 1; // 语速
    utterance.pitch = 1; // 音调
    utterance.volume = 1; // 音量
    window.speechSynthesis.speak(utterance);
};

// 滚动到聊天记录底部
const scrollToBottom = () => {
    const container = document.querySelector('.chat-history');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};
// 保存聊天记录
const saveChatHistory = () => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory.value));
};

// 保存 API 密钥
const saveApiKey = () => {
    if (apiKey.value.trim()) {
        localStorage.setItem('apiKey', apiKey.value);
    }
};

// 加载聊天记录和 API 密钥
const loadChatHistory = () => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        chatHistory.value = JSON.parse(savedHistory);
    }
};

const loadApiKey = () => {
    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
        apiKey.value = savedApiKey;
    }
};

// 监听聊天记录变化，自动滚动到底部
watch(chatHistory, () => {
    nextTick(() => {
        scrollToBottom();
    });
});


onMounted(() => {
    loadChatHistory();
    loadApiKey();
});
</script>

<style lang="scss" scoped>
.flex {
    display: flex;
}

.h100 {
    height: 100%;
}

.live2d-container {
    background-color: black;
}

.chat-container {
    flex: 1;
    margin: 0 auto;
    padding: 20px;
}

.api-key-container {
    margin-bottom: 20px;
}

.chat-history {
    margin-bottom: 20px;
}

.chat-container {
    display: flex;
    flex-direction: column;

    .chat-history {
        flex: 1;
        overflow-y: scroll;
    }
}

.chat-input {
    display: flex;
    gap: 1.5rem;

    button {
        height: 100%;
    }
}
</style>