import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([{
    languageOptions: {
        globals: {
            ...globals.webextensions,
        },

        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        eqeqeq: ["error", "smart"],
        "no-var": "error",

        "prefer-const": ["error", {
            destructuring: "all",
        }],

        "no-unused-vars": ["warn", {
            argsIgnorePattern: "^_",
        }],

        "no-undef": "error",
        "no-shadow": "warn",
        "no-throw-literal": "error",
        "no-implicit-globals": "error",
        "no-template-curly-in-string": "warn",

        "no-constant-condition": ["error", {
            checkLoops: false,
        }],

        curly: ["warn", "multi-line"],
    },
}, {
    files: ["src/background/**/*.js", "src/lib/**/*.js"],

    languageOptions: {
        globals: {
            ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
            globalThis: "readonly",
            console: "readonly",
            URL: "readonly",
            URLSearchParams: "readonly",
        },
    },
}, {
    files: [
        "src/options/**/*.js",
        "src/popup/**/*.js",
        "src/setup/**/*.js",
        "src/shared/**/*.js",
    ],

    languageOptions: {
        globals: {
            ...globals.browser,
        },
    },
}, {
    files: ["test/**/*.mjs", "local/**/*.mjs"],

    languageOptions: {
        globals: {
            ...globals.node,
        },
    },
}, {
    files: ["**/*.cjs"],

    languageOptions: {
        globals: {
            ...globals.node,
        },

        ecmaVersion: 5,
        sourceType: "commonjs",
    },
}]);