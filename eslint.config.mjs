import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["**/*.{js,cjs}"],
    languageOptions: {
      globals: { ...globals.node }, // Node.js globals (require, module, etc.)
      sourceType: "commonjs", // For CommonJS (Discord.js uses require)
      ecmaVersion: 2021, // Modern JS version
    },
    rules: {
      ...js.configs.recommended.rules, // @eslint/js recommended rules
      semi: ["error", "always"], // Your custom rule
      "no-console": ["warn"], // Allow console logs with warning
    },
  },
];
