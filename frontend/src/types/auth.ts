export interface LoginFormProps {
    onSubmit: (values: LoginFormValues) => void;
    error?: string;
    onsuccess?: () => void;
    loading?: boolean;
}

export interface LoginFormValues {
    username: string;
    password: string;
}

export interface LoginResponse {
  success: boolean
  data?: {
    user: { id: string; username: string }
    salt: string
    token: string
  }
  error?: { code: string; message: string }
}

export interface RegisterFormProps {
    onSubmit: (values: RegisterFormValues) => void;
    error?: string;
    onsuccess?: () => void;
    loading?: boolean;
}

export interface RegisterFormValues {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean
  data?: {
    user: { id: string; username: string; email: string }
    salt: string
    token: string
  }
  error?: { code: string; message: string }
}