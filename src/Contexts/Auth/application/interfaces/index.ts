export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface AuthenticateWithGoogleRequest {
  idToken: string;
}

export interface RegisterUserRequest extends LoginUserRequest {
  id: string;
  username: string;
  repeatPassword?: string;
}

export interface UpdatePasswordRequest {
  password: string;
  repeatPassword: string;
  oldPassword: string;
}

export interface UserSessionInfo {
  username: string;
  id: string;
  email: string;
}
