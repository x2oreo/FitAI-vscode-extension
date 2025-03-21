import * as vscode from 'vscode';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User,
  updateProfile
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
      await signInWithEmailAndPassword(auth, savedEmail, savedPassword);
      return true;
    } catch (error) {
      // Stored credentials are invalid, clear them
      await context.globalState.update('userEmail', undefined);
      await context.globalState.update('userPassword', undefined);
    }
  }
  
  // If not logged in or login failed, show login form
  return showLoginForm(context);
}

export async function showLoginForm(context: vscode.ExtensionContext): Promise<boolean> {
  // Show a multi-step input to get email and password
  const email = await vscode.window.showInputBox({
    prompt: 'Enter your email address',
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
    
    // Save credentials securely for auto-login
    await context.globalState.update('userEmail', email);
    await context.globalState.update('userPassword', password);
    
    vscode.window.showInformationMessage(`Welcome back, ${getUserDisplayName()}!`);
    return true;
  } catch (error) {
    // If login fails, offer to register
    const errorMessage = (error as Error).message;
    vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
    
    const register = await vscode.window.showQuickPick(['Register a new account', 'Try again', 'Cancel'], {
      placeHolder: 'Account not found. Would you like to register?'
    });
    
    if (register === 'Register a new account') {
      return showRegistrationForm(context);
    } else if (register === 'Try again') {
      return showLoginForm(context);
    }
    
    return false;
  }
}

export async function showRegistrationForm(context: vscode.ExtensionContext): Promise<boolean> {
  const email = await vscode.window.showInputBox({
    prompt: 'Enter your email address to register',
    placeHolder: 'email@example.com',
    ignoreFocusOut: true
  });
  
  if (!email) {
    return false;
  }
  
  const displayName = await vscode.window.showInputBox({
    prompt: 'What\'s your name?',
    placeHolder: 'Your name (will be used in notifications)',
    ignoreFocusOut: true
  });
  
  if (!displayName) {
    return false;
  }
  
  const password = await vscode.window.showInputBox({
    prompt: 'Create a password (min 6 characters)',
    password: true,
    ignoreFocusOut: true
  });
  
  if (!password) {
    return false;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set the user's display name
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    // Save credentials securely for auto-login
    await context.globalState.update('userEmail', email);
    await context.globalState.update('userPassword', password);
    
    vscode.window.showInformationMessage(`Account created successfully! Welcome, ${displayName}!`);
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Registration failed: ${(error as Error).message}`);
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

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
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