export type StudioActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  fieldErrors?: Record<string, string>;
  revision?: number;
};

export const initialStudioActionState: StudioActionState = {
  status: 'idle',
  message: '',
};
