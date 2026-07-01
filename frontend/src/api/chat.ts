import client from './client';

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
}

export const chatApi = {
  chat: (message: string, history: ChatMessagePayload[] = []) => 
    client.post<any, ChatResponse>('/chat', { message, history }),
};
export default chatApi;
