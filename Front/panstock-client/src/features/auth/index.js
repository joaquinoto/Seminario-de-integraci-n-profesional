// features/auth/index.js
export {
  default as authReducer,
  loginUser,
  registerUser,
  fetchProfile,
  logout,
  clearError,
  resetStatus,
  selectIsAuthenticated,
  selectUser,
  selectToken,
  selectAuthStatus,
  selectAuthError,
  selectLastAction,
} from './authSlice';
