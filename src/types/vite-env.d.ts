declare global {
    interface Window {
        // Add your custom properties here
        _env_: Record<string, any>;
    }
}

// Crucial: If your file doesn't have any imports or exports,
// add this line to force TypeScript to treat it as a module.
export {};
