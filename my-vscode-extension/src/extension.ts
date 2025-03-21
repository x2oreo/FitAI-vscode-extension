import * as vscode from 'vscode';
import { initializeAuth, logout, isLoggedIn, showLoginForm, getUserDisplayName } from './authService';

let statusBarItem: vscode.StatusBarItem;
let timerInterval: NodeJS.Timer | undefined;
let breakInterval: NodeJS.Timer | undefined;
let elapsedTime: number = 0; 
let breakReminderShown: boolean = false; 
let isOnBreak: boolean = false;
let completedPomodoros: number = 0; 

// Config functions to get settings with defaults
function getWorkDuration(): number {
  const config = vscode.workspace.getConfiguration('fitai.timer');
  return config.get('workDuration', 25); // Default: 25 seconds
}

function getShortBreakDuration(): number {
  const config = vscode.workspace.getConfiguration('fitai.timer');
  return config.get('shortBreakDuration', 5); // Default: 5 seconds
}

function getLongBreakDuration(): number {
  const config = vscode.workspace.getConfiguration('fitai.timer');
  return config.get('longBreakDuration', 20); // Default: 20 seconds
}

// Personalized message templates with {name} placeholders
const shortBreakStartMessages = [
  "{name}, time for a break! You've earned it. Step away, stretch, and refresh your mind. 🚶‍♂️💡",
  "Great work, {name}! Now take 5 to recharge. Your brain will thank you. 🧠✨",
  "Break time, {name}! Move a little, breathe deeply, and get ready for your next win. 💪",
  "You crushed that session, {name}! Now, give yourself the break you deserve. ☕🎯",
  "{name}, 25 seconds of deep focus – done! Rest for 5, and come back even stronger. 🔥",
];

const longBreakStartMessages = [
  "{name}, you've conquered 4 Pomodoros! Take a well-earned long break and recharge. 🏆",
  "Deep work accomplished, {name}! Now take a longer break to refresh completely. ☕🌿",
  "Amazing work, {name}! Step away, stretch, hydrate, and give your mind a real rest. 🌞",
  "{name}, you've been on fire! A long break will keep your mind sharp for the next round. 🚀",
  "Big effort deserves big rest, {name}! Take 15–20 seconds to truly unwind. 🎧☕"
];

const breakEndMessages = [
  "Break's over, {name}! Time to dive back in and keep the momentum going. 🚀",
  "Refreshed, {name}? Let's get back to coding greatness. You've got this! 💻⚡",
  "Hope you stretched, {name}! Now, let's tackle the next challenge. Onward! 💡",
  "Time to shine again, {name}! Channel that fresh energy into your next task. ✨",
  "{name}, let's make the next 25 seconds even more productive. Focus mode: ON! 🔥",
];

// Add this to your constants section:
const hydrationReminders = [
  "{name}, remember to stay hydrated! Grab some water during your break. 💧",
  "Hydration check, {name}! How about some water before diving back in? 🚰",
  "Coding is better with water, {name}! Take a sip during this break. 💦",
  "{name}, keep your brain sharp by staying hydrated! Time for water. 🧠💧",
  "Water break alert, {name}! Hydration leads to better code quality. 💧💻"
];

export async function activate(context: vscode.ExtensionContext) {
  // Initialize authentication
  const authenticated = await initializeAuth(context);
  
  if (!authenticated) {
    vscode.window.showWarningMessage('FitAI needs authentication to work properly. You can login later via the "Login to FitAI" command.');
  } else {
    // Create status bar item and start the timer
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    startTimer();
  }
  
  // Register commands for timer settings
  let configureWorkDurationCommand = vscode.commands.registerCommand('extension.configureWorkDuration', async () => {
    const currentDuration = getWorkDuration();
    const input = await vscode.window.showInputBox({
      prompt: 'Enter work duration in seconds',
      value: currentDuration.toString(),
      validateInput: validateNumberInput
    });
    
    if (input) {
      const duration = parseInt(input);
      await vscode.workspace.getConfiguration('fitai.timer').update('workDuration', duration, true);
      vscode.window.showInformationMessage(`Work duration updated to ${duration} seconds`);
      
      // Restart timer if it's running
      if (timerInterval && !isOnBreak) {
        clearInterval(timerInterval as NodeJS.Timeout);
        elapsedTime = 0;
        breakReminderShown = false;
        startTimer();
      }
    }
  });
  
  let configureShortBreakCommand = vscode.commands.registerCommand('extension.configureShortBreak', async () => {
    const currentDuration = getShortBreakDuration();
    const input = await vscode.window.showInputBox({
      prompt: 'Enter short break duration in seconds',
      value: currentDuration.toString(),
      validateInput: validateNumberInput
    });
    
    if (input) {
      const duration = parseInt(input);
      await vscode.workspace.getConfiguration('fitai.timer').update('shortBreakDuration', duration, true);
      vscode.window.showInformationMessage(`Short break duration updated to ${duration} seconds`);
    }
  });
  
  let configureLongBreakCommand = vscode.commands.registerCommand('extension.configureLongBreak', async () => {
    const currentDuration = getLongBreakDuration();
    const input = await vscode.window.showInputBox({
      prompt: 'Enter long break duration in seconds',
      value: currentDuration.toString(),
      validateInput: validateNumberInput
    });
    
    if (input) {
      const duration = parseInt(input);
      await vscode.workspace.getConfiguration('fitai.timer').update('longBreakDuration', duration, true);
      vscode.window.showInformationMessage(`Long break duration updated to ${duration} seconds`);
    }
  });
  
  // Register auth related commands
  let loginCommand = vscode.commands.registerCommand('extension.login', async () => {
    const success = await showLoginForm(context);
    if (success && !timerInterval) {
      // If login successful and timer not running, start it
      startTimer();
    }
  });
  
  let logoutCommand = vscode.commands.registerCommand('extension.logout', async () => {
    await logout(context);
    // Stop the timer if it's running
    if (timerInterval) {
      clearInterval(timerInterval as NodeJS.Timeout);
      timerInterval = undefined;
    }
    if (breakInterval) {
      clearInterval(breakInterval as NodeJS.Timeout);
      breakInterval = undefined;
    }
    // Hide status bar
    if (statusBarItem) {
      statusBarItem.hide();
    }
  });
  
  let takeBreakDisposable = vscode.commands.registerCommand('extension.takeBreak', () => {
    if (isLoggedIn()) {
      takeBreak();
    } else {
      vscode.window.showWarningMessage('Please log in to use FitAI features.', 'Login').then(selection => {
        if (selection === 'Login') {
          vscode.commands.executeCommand('extension.login');
        }
      });
    }
  });

  // Add new commands to subscriptions
  context.subscriptions.push(configureWorkDurationCommand);
  context.subscriptions.push(configureShortBreakCommand);
  context.subscriptions.push(configureLongBreakCommand);

  context.subscriptions.push(loginCommand);
  context.subscriptions.push(logoutCommand);
  context.subscriptions.push(takeBreakDisposable);
  
  // Register configuration change listener
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('fitai.timer')) {
      // If timer settings changed, restart timer if it's running
      if (timerInterval && !isOnBreak) {
        clearInterval(timerInterval as NodeJS.Timeout);
        elapsedTime = 0;
        breakReminderShown = false;
        startTimer();
      }
    }
  }));

  context.subscriptions.push({ 
    dispose: () => {
      if (timerInterval) {
        clearInterval(timerInterval as NodeJS.Timeout);
      }
      if (breakInterval) {
        clearInterval(breakInterval as NodeJS.Timeout);
      }
    }
  });
}

// Helper function to validate input is a positive number
function validateNumberInput(input: string): string | undefined {
  const num = Number(input);
  if (isNaN(num)) {
    return 'Please enter a valid number';
  }
  if (num <= 0) {
    return 'Please enter a positive number';
  }
  return undefined; // Input is valid
}

function startTimer() {
  if (!isLoggedIn()) {
    vscode.window.showWarningMessage('Please log in to use FitAI features.', 'Login').then(selection => {
      if (selection === 'Login') {
        vscode.commands.executeCommand('extension.login');
      }
    });
    return;
  }
  
  if (isOnBreak) {
    return; 
  }
  
  updateStatusBar();
  statusBarItem.show();
  
  timerInterval = setInterval(() => {
    elapsedTime++;
    updateStatusBar();
    
    // Use the configurable work duration
    if (elapsedTime >= getWorkDuration() && !breakReminderShown) {
      showBreakReminder();
      breakReminderShown = true;
    }
  }, 1000);
}

function updateStatusBar() {
  // For seconds-based timer, we can simplify this
  const seconds = elapsedTime;
  
  // Format time as SS
  const timeString = `$(clock) ${seconds} seconds`;
  
  statusBarItem.text = timeString;
  statusBarItem.tooltip = `Time elapsed (${completedPomodoros} pomodoros completed)`;
}

function showTemporaryMessage(message: string, timeout: number = 3000) {
  const notification = vscode.window.showInformationMessage(message);
  
  setTimeout(() => {
    if (notification && (notification as any).close) {
      (notification as any).close();
    }
  }, timeout);
}

function playNotificationSound() {
  vscode.commands.executeCommand('editor.action.playAudioCue');
}

function getRandomMessage(messages: string[]): string {
  const randomIndex = Math.floor(Math.random() * messages.length);
  // Replace {name} placeholder with actual user name
  return messages[randomIndex].replace('{name}', getUserDisplayName());
}

// Modified to use configured durations
function showBreakReminder() {
  playNotificationSound();
  
  const userName = getUserDisplayName();
  const message = `Time for a break, ${userName}! You've been working for ${getWorkDuration()} seconds.`;
  
  // Show temporary message that auto-dismisses
  showTemporaryMessage(message);
  
  // Automatically start break after a short delay
  setTimeout(() => {
    takeBreak();
  }, 1500);
}

// Add this function to randomly show hydration reminders
function maybeShowHydrationReminder() {
  // Show hydration reminder with 30% probability during breaks
  if (Math.random() < 0.3) {
    showTemporaryMessage(getRandomMessage(hydrationReminders), 5000);
  }
}

// Modified to use configured durations
function takeBreak() {
  isOnBreak = true;
  completedPomodoros++;
  
  if (timerInterval) {
    clearInterval(timerInterval as NodeJS.Timeout);
  }
  
  const isLongBreak = completedPomodoros % 4 === 0;
  // Use configurable break durations
  const breakDurationSeconds = isLongBreak ? getLongBreakDuration() : getShortBreakDuration();
  
  let breakTimeRemaining = breakDurationSeconds;
  
  const breakPrefix = isLongBreak ? 'Long Break' : 'Break';
  updateBreakStatusBar(breakPrefix, breakTimeRemaining);
  statusBarItem.tooltip = isLongBreak ? 'Enjoy your long break!' : 'Enjoy your short break!';
  statusBarItem.command = undefined; 
  
  playNotificationSound();
  
  const message = isLongBreak 
    ? getRandomMessage(longBreakStartMessages) 
    : getRandomMessage(shortBreakStartMessages);
    
  showTemporaryMessage(
    `${message} (${completedPomodoros} pomodoros completed)`
  );
  
  // Maybe show hydration reminder a second after break starts
  setTimeout(() => {
    maybeShowHydrationReminder();
  }, 1000);
  
  breakInterval = setInterval(() => {
    breakTimeRemaining--;
    
    if (breakTimeRemaining < 0) {
      endBreak();
    } else {
      updateBreakStatusBar(breakPrefix, breakTimeRemaining);
    }
  }, 1000);
}

function updateBreakStatusBar(breakPrefix: string, timeRemainingSecs: number) {
  // Simplified for seconds-only display
  statusBarItem.text = `$(coffee) ${breakPrefix}: ${timeRemainingSecs}s remaining`;
}

function endBreak() {
  isOnBreak = false;
  
  if (breakInterval) {
    clearInterval(breakInterval as NodeJS.Timeout);
    breakInterval = undefined;
  }
  
  playNotificationSound();
  
  const message = getRandomMessage(breakEndMessages);
  showTemporaryMessage(message);
  
  elapsedTime = 0;
  breakReminderShown = false;
  startTimer();
}

export function deactivate() {
  if (timerInterval) {
    clearInterval(timerInterval as NodeJS.Timeout);
  }
  if (breakInterval) {
    clearInterval(breakInterval as NodeJS.Timeout);
  }
}