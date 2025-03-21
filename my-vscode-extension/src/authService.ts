import * as vscode from 'vscode';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
    signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Global state
let currentUser: User | null = null;

export async function initializeAuth(context: vscode.ExtensionContext): Promise<boolean> {
  // Check if user is already logged in from stored credentials
  const savedEmail = context.globalState.get<string>('userEmail');
  const savedPassword = context.globalState.get<string>('userPassword');
  
  if (savedEmail && savedPassword) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      currentUser = userCredential.user; // Ensure currentUser is set immediately
      return true;
    } catch (error) {
      // Stored credentials are invalid, clear them
      await context.globalState.update('userEmail', undefined);
      await context.globalState.update('userPassword', undefined);
      vscode.window.showWarningMessage('Your saved login has expired. Please log in again.');
    }
  }
  
  // If not logged in or login failed, show login form
  return showLoginForm(context);
}

export async function showLoginForm(context: vscode.ExtensionContext): Promise<boolean> {
  // Show a multi-step input to get email and password
  const email = await vscode.window.showInputBox({
    prompt: 'Enter your email addres, if you dont have an account, you can register at the FitAI app.',
    placeHolder: 'email@example.com',
    ignoreFocusOut: true
  });
  
  if (!email) {
    return false; // User cancelled
  }
  
  const password = await vscode.window.showInputBox({
    prompt: 'Enter your password',
    password: true,
    ignoreFocusOut: true
  });
  
  if (!password) {
    return false; // User cancelled
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Set current user immediately to avoid timing issues
    currentUser = userCredential.user;
    
    // Save credentials securely for auto-login
    await context.globalState.update('userEmail', email);
    await context.globalState.update('userPassword', password);
    
    vscode.window.showInformationMessage(`Welcome back, ${getUserDisplayName()}!`);
    return true;
  } catch (error) {
    // Handle various Firebase authentication errors with specific messages
    const firebaseError = error as any;
    const errorCode = firebaseError.code || '';
    const errorMessage = firebaseError.message;
    
    if (errorCode === 'auth/invalid-credential' || errorMessage.includes('auth/invalid-credential')) {
      vscode.window.showErrorMessage('Invalid email or password. Please try again.');
    } else if (errorCode === 'auth/user-not-found' || errorMessage.includes('auth/user-not-found')) {
      vscode.window.showErrorMessage('No account found with this email. Please check and try again.');
    } else if (errorCode === 'auth/too-many-requests' || errorMessage.includes('auth/too-many-requests')) {
      vscode.window.showErrorMessage('Too many failed login attempts. Please try again later.');
    } else if (errorCode === 'auth/network-request-failed' || errorMessage.includes('network')) {
      vscode.window.showErrorMessage('Network error. Please check your connection and try again.');
    } else {
      vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
    }
    
    vscode.window.showInformationMessage('To register a new account, please download and use the FitAI app.');
    
    return false;
  }
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
  try {
    await signOut(auth);
    await context.globalState.update('userEmail', undefined);
    await context.globalState.update('userPassword', undefined);
    currentUser = null;
    vscode.window.showInformationMessage('You have been logged out.');
  } catch (error) {
    vscode.window.showErrorMessage(`Logout failed: ${(error as Error).message}`);
  }
}

// Listen for auth state changes and make it more robust
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  // Log authentication state changes for debugging
  console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
}, (error) => {
  console.error('Auth state change error:', error);
  vscode.window.showErrorMessage(`Authentication error: ${error.message}`);
});

export function getCurrentUser(): User | null {
  return currentUser;
}

export function isLoggedIn(): boolean {
  return currentUser !== null;
}

export function getUserDisplayName(): string {
  if (currentUser && currentUser.displayName) {
    return currentUser.displayName;
  }
  return 'there'; // Default fallback if no name is available
}