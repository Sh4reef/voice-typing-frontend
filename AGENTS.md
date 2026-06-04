# VoiceTyping Landing Page

This project is a high-performance landing page for **VoiceTyping**, a universal voice-to-text overlay engine. It is built using **Vite** and **Tailwind CSS v4**, featuring a modern, dark-themed aesthetic with interactive simulations of the app's functionality.

## Project Overview

*   **Technology Stack:** Vite, Tailwind CSS v4, Vanilla JavaScript.
*   **Architecture:** Multi-page application (MPA) with a main landing page (`index.html`) and a success/thank-you page (`thank-you/index.html`).
*   **Key Features:**
    *   **Interactive Sandbox:** Simulates voice recording, transcription, and text injection.
    *   **Dynamic Waveform:** Custom canvas-based waveform renderer (`src/waveform.js`).
    *   **OS Detection:** Automatically detects user's operating system to prioritize download links.
    *   **Draggable Overlay:** Simulates the app's floating widget behavior.

## Project Structure

```text
├── index.html              # Main landing page
├── package.json            # Project dependencies and scripts
├── vite.config.js          # Vite configuration with Tailwind and MPA routing
├── public/                 # Static assets (icons, logo, favicon)
├── src/
│   ├── main.js             # Main entry point, handles simulator logic and OS detection
│   ├── style.css           # Global styles and Tailwind v4 configuration
│   ├── waveform.js         # Canvas-based waveform rendering class
│   └── assets/             # Images and SVGs used in the site
└── thank-you/
    ├── index.html          # Success page after "purchase" or download
    └── thank-you.js        # Script to handle transaction parameters
```

## Building and Running

### Prerequisites

*   **Node.js:** Ensure you have Node.js installed (v18+ recommended).
*   **npm:** Used for dependency management.

### Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install project dependencies. |
| `npm run dev` | Start the development server (default: http://localhost:5173). |
| `npm run build` | Build the project for production. Output is in `dist/`. |
| `npm run preview` | Locally preview the production build. |

## Development Conventions

*   **Tailwind CSS v4:** This project uses the new `@theme` based configuration in `src/style.css`. Avoid adding a separate `tailwind.config.js` unless necessary.
*   **Vanilla JS:** Logic is kept in clean, modular JavaScript files. Prefer maintaining the `WaveformRenderer` class structure for waveform-related changes.
*   **MPA Routing:** Multi-page routing is handled in `vite.config.js` using `rollupOptions.input`. New pages must be registered there.
*   **Styling:** Follow the existing "glassmorphism" and dark-mode aesthetic defined in `src/style.css`. Use CSS variables defined in the `@theme` block for consistency.
*   **Testing:** Currently, there is no automated testing suite. TODO: Implement basic Playwright or Cypress tests for UI interactions.
