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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const authService_1 = require("./authService");
let statusBarItem;
let timerInterval;
let breakInterval;
let elapsedTime = 0;
let breakReminderShown = false;
let isOnBreak = false;
let completedPomodoros = 0;
function getWorkDuration() {
    const config = vscode.workspace.getConfiguration('fitai.timer');
    return config.get('workDuration', 25);
}
function getShortBreakDuration() {
    const config = vscode.workspace.getConfiguration('fitai.timer');
    return config.get('shortBreakDuration', 5);
}
function getLongBreakDuration() {
    const config = vscode.workspace.getConfiguration('fitai.timer');
    return config.get('longBreakDuration', 15);
}
const shortBreakStartMessages = [
    "{name}, time for a break! You've earned it. Step away, stretch, and refresh your mind. 🚶‍♂️💡",
    "Great work, {name}! Now take 5 minutes to recharge. Your brain will thank you. 🧠✨",
    "Break time, {name}! Move a little, breathe deeply, and get ready for your next win. 💪",
    "You crushed that session, {name}! Now, give yourself the break you deserve. ☕🎯",
    "{name}, 25 minutes of deep focus – done! Rest for 5, and come back even stronger. 🔥",
];
const longBreakStartMessages = [
    "{name}, you've conquered 4 Pomodoros! Take a well-earned long break and recharge. 🏆",
    "Deep work accomplished, {name}! Now take a longer break to refresh completely. ☕🌿",
    "Amazing work, {name}! Step away, stretch, hydrate, and give your mind a real rest. 🌞",
    "{name}, you've been on fire! A long break will keep your mind sharp for the next round. 🚀",
    "Big effort deserves big rest, {name}! Take 15 minutes to truly unwind. 🎧☕"
];
const breakEndMessages = [
    "Break's over, {name}! Time to dive back in and keep the momentum going. 🚀",
    "Refreshed, {name}? Let's get back to coding greatness. You've got this! 💻⚡",
    "Hope you stretched, {name}! Now, let's tackle the next challenge. Onward! 💡",
    "Time to shine again, {name}! Channel that fresh energy into your next task. ✨",
    "{name}, let's make the next 25 minutes even more productive. Focus mode: ON! 🔥",
];
const hydrationReminders = [
    "{name}, remember to stay hydrated! Grab some water during your break. 💧",
    "Hydration check, {name}! How about some water before diving back in? 🚰",
    "Coding is better with water, {name}! Take a sip during this break. 💦",
    "{name}, keep your brain sharp by staying hydrated! Time for water. 🧠💧",
    "Water break alert, {name}! Hydration leads to better code quality. 💧💻"
];
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const authenticated = yield (0, authService_1.initializeAuth)(context);
        if (!authenticated) {
            vscode.window.showWarningMessage('FitAI needs authentication to work properly. You can login later via the "Login to FitAI" command.');
        }
        else {
            statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
            context.subscriptions.push(statusBarItem);
            startTimer();
        }
        let configureWorkDurationCommand = vscode.commands.registerCommand('extension.configureWorkDuration', () => __awaiter(this, void 0, void 0, function* () {
            const currentDuration = getWorkDuration();
            const input = yield vscode.window.showInputBox({
                prompt: 'Enter work duration in minutes',
                value: currentDuration.toString(),
                validateInput: validateNumberInput
            });
            if (input) {
                const duration = parseInt(input);
                yield vscode.workspace.getConfiguration('fitai.timer').update('workDuration', duration, true);
                vscode.window.showInformationMessage(`Work duration updated to ${duration} minutes`);
                if (timerInterval && !isOnBreak) {
                    clearInterval(timerInterval);
                    elapsedTime = 0;
                    breakReminderShown = false;
                    startTimer();
                }
            }
        }));
        let configureShortBreakCommand = vscode.commands.registerCommand('extension.configureShortBreak', () => __awaiter(this, void 0, void 0, function* () {
            const currentDuration = getShortBreakDuration();
            const input = yield vscode.window.showInputBox({
                prompt: 'Enter short break duration in minutes',
                value: currentDuration.toString(),
                validateInput: validateNumberInput
            });
            if (input) {
                const duration = parseInt(input);
                yield vscode.workspace.getConfiguration('fitai.timer').update('shortBreakDuration', duration, true);
                vscode.window.showInformationMessage(`Short break duration updated to ${duration} minutes`);
            }
        }));
        let configureLongBreakCommand = vscode.commands.registerCommand('extension.configureLongBreak', () => __awaiter(this, void 0, void 0, function* () {
            const currentDuration = getLongBreakDuration();
            const input = yield vscode.window.showInputBox({
                prompt: 'Enter long break duration in minutes',
                value: currentDuration.toString(),
                validateInput: validateNumberInput
            });
            if (input) {
                const duration = parseInt(input);
                yield vscode.workspace.getConfiguration('fitai.timer').update('longBreakDuration', duration, true);
                vscode.window.showInformationMessage(`Long break duration updated to ${duration} minutes`);
            }
        }));
        let loginCommand = vscode.commands.registerCommand('extension.login', () => __awaiter(this, void 0, void 0, function* () {
            const success = yield (0, authService_1.showLoginForm)(context);
            if (success && !timerInterval) {
                startTimer();
            }
        }));
        let logoutCommand = vscode.commands.registerCommand('extension.logout', () => __awaiter(this, void 0, void 0, function* () {
            yield (0, authService_1.logout)(context);
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = undefined;
            }
            if (breakInterval) {
                clearInterval(breakInterval);
                breakInterval = undefined;
            }
            if (statusBarItem) {
                statusBarItem.hide();
            }
        }));
        let takeBreakDisposable = vscode.commands.registerCommand('extension.takeBreak', () => {
            if ((0, authService_1.isLoggedIn)()) {
                takeBreak();
            }
            else {
                vscode.window.showWarningMessage('Please log in to use FitAI features.', 'Login').then(selection => {
                    if (selection === 'Login') {
                        vscode.commands.executeCommand('extension.login');
                    }
                });
            }
        });
        context.subscriptions.push(configureWorkDurationCommand);
        context.subscriptions.push(configureShortBreakCommand);
        context.subscriptions.push(configureLongBreakCommand);
        context.subscriptions.push(loginCommand);
        context.subscriptions.push(logoutCommand);
        context.subscriptions.push(takeBreakDisposable);
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fitai.timer')) {
                if (timerInterval && !isOnBreak) {
                    clearInterval(timerInterval);
                    elapsedTime = 0;
                    breakReminderShown = false;
                    startTimer();
                }
            }
        }));
        context.subscriptions.push({
            dispose: () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                }
                if (breakInterval) {
                    clearInterval(breakInterval);
                }
            }
        });
    });
}
exports.activate = activate;
function validateNumberInput(input) {
    const num = Number(input);
    if (isNaN(num)) {
        return 'Please enter a valid number';
    }
    if (num <= 0) {
        return 'Please enter a positive number';
    }
    return undefined;
}
function startTimer() {
    if (!(0, authService_1.isLoggedIn)()) {
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
        if (elapsedTime >= getWorkDuration() * 60 && !breakReminderShown) {
            showBreakReminder();
            breakReminderShown = true;
        }
    }, 1000);
}
function updateStatusBar() {
    const totalMinutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    const timeString = `$(clock) ${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
    statusBarItem.text = timeString;
    statusBarItem.tooltip = `Time elapsed (${completedPomodoros} pomodoros completed)`;
}
function showTemporaryMessage(message, timeout = 3000) {
    const notification = vscode.window.showInformationMessage(message);
    setTimeout(() => {
        if (notification && notification.close) {
            notification.close();
        }
    }, timeout);
}
function playNotificationSound() {
    vscode.commands.executeCommand('editor.action.playAudioCue');
}
function getRandomMessage(messages) {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex].replace('{name}', (0, authService_1.getUserDisplayName)());
}
function showBreakReminder() {
    playNotificationSound();
    const userName = (0, authService_1.getUserDisplayName)();
    const message = `Time for a break, ${userName}! You've been working for ${getWorkDuration()} minutes.`;
    showTemporaryMessage(message);
    setTimeout(() => {
        takeBreak();
    }, 1500);
}
function maybeShowHydrationReminder() {
    if (Math.random() < 0.3) {
        showTemporaryMessage(getRandomMessage(hydrationReminders), 5000);
    }
}
function takeBreak() {
    isOnBreak = true;
    completedPomodoros++;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    const isLongBreak = completedPomodoros % 4 === 0;
    const breakDurationMinutes = isLongBreak ? getLongBreakDuration() : getShortBreakDuration();
    const breakDurationSeconds = breakDurationMinutes * 60;
    let breakTimeRemaining = breakDurationSeconds;
    const breakPrefix = isLongBreak ? 'Long Break' : 'Break';
    updateBreakStatusBar(breakPrefix, breakTimeRemaining);
    statusBarItem.tooltip = isLongBreak ? 'Enjoy your long break!' : 'Enjoy your short break!';
    statusBarItem.command = undefined;
    playNotificationSound();
    const message = isLongBreak
        ? getRandomMessage(longBreakStartMessages)
        : getRandomMessage(shortBreakStartMessages);
    showTemporaryMessage(`${message} (${completedPomodoros} pomodoros completed)`);
    setTimeout(() => {
        maybeShowHydrationReminder();
    }, 1000);
    breakInterval = setInterval(() => {
        breakTimeRemaining--;
        if (breakTimeRemaining < 0) {
            endBreak();
        }
        else {
            updateBreakStatusBar(breakPrefix, breakTimeRemaining);
        }
    }, 1000);
}
function updateBreakStatusBar(breakPrefix, timeRemainingSecs) {
    const minutes = Math.floor(timeRemainingSecs / 60);
    const seconds = timeRemainingSecs % 60;
    statusBarItem.text = `$(coffee) ${breakPrefix}: ${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
}
function endBreak() {
    isOnBreak = false;
    if (breakInterval) {
        clearInterval(breakInterval);
        breakInterval = undefined;
    }
    playNotificationSound();
    const message = getRandomMessage(breakEndMessages);
    showTemporaryMessage(message);
    elapsedTime = 0;
    breakReminderShown = false;
    startTimer();
}
function deactivate() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    if (breakInterval) {
        clearInterval(breakInterval);
    }
}
exports.deactivate = deactivate;
