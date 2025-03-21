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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = void 0;
const path = __importStar(require("path"));
const mocha_1 = __importDefault(require("mocha"));
const glob = require("glob");
function runTests() {
    // Create the mocha test
    const mocha = new mocha_1.default({
        ui: 'tdd',
        color: true
    });
    const testsRoot = path.resolve(__dirname, '..');
    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
        if (err) {
            throw err;
        }
        // Add each file to the mocha instance
        files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));
        try {
            // Run the mocha test
            mocha.run(failures => {
                process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
            });
        }
        catch (err) {
            console.error(err);
            process.exitCode = 1; // exit with non-zero status on error
        }
    });
}
exports.runTests = runTests;
