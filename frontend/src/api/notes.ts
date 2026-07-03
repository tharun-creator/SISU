import client from './client';

export interface Note {
  id: number;
  title: string;
  content: string;
  photo_url?: string;
  is_shared?: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
}

export const notesApi = {
  getNotes: () => client.get<any, Note[]>('/notes'),
  createNote: (data: { title: string; content: string }) => client.post<any, Note>('/notes', data),
  updateNote: (id: number, data: { title: string; content: string; is_shared?: boolean }) => client.put<any, Note>(`/notes/${id}`, data),
  deleteNote: (id: number) => client.delete(`/notes/${id}`),
  deleteNotePhoto: (id: number) => client.delete(`/notes/${id}/photo`),
  uploadNotePhoto: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post<any, Note>(`/notes/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getSharedNote: (token: string) => client.get<any, Note>(`/notes/shared/${token}`),
};
export default notesApi;
