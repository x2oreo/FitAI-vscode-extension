"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDisplayName = exports.isLoggedIn = exports.getCurrentUser = exports.logout = exports.showLoginForm = exports.initializeAuth = void 0;
const vscode = __importStar(require("vscode"));
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firebaseConfig_1 = require("./firebaseConfig");
// Initialize Firebase
const app = (0, app_1.initializeApp)(firebaseConfig_1.firebaseConfig);
const auth = (0, auth_1.getAuth)(app);
// Global state
let currentUser = null;
function initializeAuth(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if user is already logged in from stored credentials
        const savedEmail = context.globalState.get('userEmail');
        const savedPassword = context.globalState.get('userPassword');
        if (savedEmail && savedPassword) {
            try {
                yield (0, auth_1.signInWithEmailAndPassword)(auth, savedEmail, savedPassword);
                return true;
            }
            catch (error) {
                // Stored credentials are invalid, clear them
                yield context.globalState.update('userEmail', undefined);
                yield context.globalState.update('userPassword', undefined);
            }
        }
        // If not logged in or login failed, show login form
        return showLoginForm(context);
    });
}
exports.initializeAuth = initializeAuth;
function showLoginForm(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // Show a multi-step input to get email and password
        const email = yield vscode.window.showInputBox({
            prompt: 'Enter your email addres, if you dont have an account, you can register at the FitAI app',
            placeHolder: 'email@example.com',
            ignoreFocusOut: true
        });
        if (!email) {
            return false; // User cancelled
        }
        const password = yield vscode.window.showInputBox({
            prompt: 'Enter your password',
            password: true,
            ignoreFocusOut: true
        });
        if (!password) {
            return false; // User cancelled
        }
        try {
            const userCredential = yield (0, auth_1.signInWithEmailAndPassword)(auth, email, password);
            // Save credentials securely for auto-login
            yield context.globalState.update('userEmail', email);
            yield context.globalState.update('userPassword', password);
            vscode.window.showInformationMessage(`Welcome back, ${getUserDisplayName()}!`);
            return true;
        }
        catch (error) {
            // If login fails, direct to the FitAI app for registration
            const errorMessage = error.message;
            vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
            const action = yield vscode.window.showInformationMessage('To register a new account, please download and use the FitAI app.', 'Try Again', 'Get FitAI App');
            if (action === 'Try Again') {
                return showLoginForm(context);
            }
            else if (action === 'Get FitAI App') {
                vscode.env.openExternal(vscode.Uri.parse('https://fitai.app')); // Replace with actual app URL
                return false;
            }
            return false;
        }
    });
}
exports.showLoginForm = showLoginForm;
function logout(context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, auth_1.signOut)(auth);
            yield context.globalState.update('userEmail', undefined);
            yield context.globalState.update('userPassword', undefined);
            currentUser = null;
            vscode.window.showInformationMessage('You have been logged out.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Logout failed: ${error.message}`);
        }
    });
}
exports.logout = logout;
// Listen for auth state changes
(0, auth_1.onAuthStateChanged)(auth, (user) => {
    currentUser = user;
});
function getCurrentUser() {
    return currentUser;
}
exports.getCurrentUser = getCurrentUser;
function isLoggedIn() {
    return currentUser !== null;
}
exports.isLoggedIn = isLoggedIn;
function getUserDisplayName() {
    if (currentUser && currentUser.displayName) {
        return currentUser.displayName;
    }
    return 'there'; // Default fallback if no name is available
}
exports.getUserDisplayName = getUserDisplayName;
