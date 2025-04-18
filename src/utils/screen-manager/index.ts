/**
 * Screen manager for Codex-CLI
 * This module manages the display of different interfaces.
 * It now allows displaying multiple interfaces successively without clearing.
 */

import { clearTerminal } from "../terminal";
import { stdout } from "process";

/**
 * Completely clears the terminal
 * This function is more aggressive than clearTerminal() and truly clears all history
 */
export function clearScreen(): void {
  // Standard clearing via Ink
  clearTerminal();
  
  // Use an ANSI escape sequence to clear the entire screen
  // and reposition the cursor to the top left
  stdout.write("\x1b[2J\x1b[0f");
  
  // Gentler alternative: print empty lines
  // to "push" content off the screen
  for (let i = 0; i < 30; i++) {
    console.log();
  }
  
  // Reposition cursor at the very top
  stdout.write("\x1b[0f");
}

/**
 * Global state to track the currently displayed interface
 */
let currentInterface: string | null = null;

/**
 * State to track if the next interface should be displayed below the previous one
 */
let appendNextInterface: boolean = false;

/**
 * Register a new interface as active
 * and clear the screen if needed, unless in append mode
 */
export function setActiveInterface(interfaceName: string): void {
  // If we're switching to a new interface, clear the screen unless in append mode
  if (currentInterface !== interfaceName) {
    if (!appendNextInterface) {
      clearScreen();
    } else {
      // In append mode, add a clear visual separator between interfaces
      console.log('\n'); // Vertical space before separator
      console.log('='.repeat(80)); // More visible horizontal separator
      console.log('-'.repeat(80)); // Double line for more visibility
      console.log('\n'); // Vertical space after separator
      
      // Display a title for the new interface if possible
      switch(interfaceName) {
        case "model-selection":
          console.log('\x1b[1;32m' + '// MODEL SELECTION'.padStart(40 + 9, ' ').padEnd(80, ' ') + '\x1b[0m'); // Matrix green, bold, centered
          break;
        case "terminal-chat":
          console.log('\x1b[1;32m' + '// CHAT INTERFACE'.padStart(40 + 9, ' ').padEnd(80, ' ') + '\x1b[0m'); // Matrix green, bold, centered
          break;
        default:
          console.log('\x1b[1;33m' + '// NEW INTERFACE'.padStart(40 + 11, ' ').padEnd(80, ' ') + '\x1b[0m'); // Yellow, bold, centered
      }
      
      console.log('\n'); // Additional vertical space
      
      // Reset mode for the next interface change
      appendNextInterface = false;
    }
    currentInterface = interfaceName;
  }
}

/**
 * Prepare to add the next interface below the current interface
 * without clearing the screen. Use before calling setActiveInterface().
 */
export function appendNextActiveInterface(): void {
  appendNextInterface = true;
}

/**
 * Check if a particular interface is active
 */
export function isInterfaceActive(interfaceName: string): boolean {
  return currentInterface === interfaceName;
}

/**
 * Clear the screen and reset the active interface
 */
export function reset(): void {
  clearScreen();
  currentInterface = null;
}

export default {
  clearScreen,
  setActiveInterface,
  appendNextActiveInterface,
  isInterfaceActive,
  reset
};
