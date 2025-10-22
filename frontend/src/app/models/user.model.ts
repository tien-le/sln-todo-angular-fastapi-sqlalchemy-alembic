/**
 * User model and related types
 */

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  oauth_provider?: string;
  oauth_id?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name?: string;
}

export interface UserUpdate {
  full_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

// OAuth2 related interfaces
export interface OAuth2Provider {
  name: string;
  display_name: string;
  enabled: boolean;
}

export interface OAuth2ProvidersResponse {
  oauth2_enabled: boolean;
  providers: OAuth2Provider[];
}

export interface OAuth2AuthorizationRequest {
  provider: string;
  redirect_uri?: string;
}

export interface OAuth2AuthorizationResponse {
  authorization_url: string;
  state: string;
}

export interface OAuth2CallbackRequest {
  code: string;
  state: string;
  provider: string;
}

export interface OAuth2LinkAccountRequest {
  provider: string;
  code: string;
  state: string;
}

export interface OAuth2UnlinkAccountRequest {
  provider: string;
}
