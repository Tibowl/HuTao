import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
    {
        ignores: ["dist/", "node_modules/"]
    },
    js.configs.recommended,
    tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        plugins: {
            "@stylistic": stylistic
        },
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.es2020,
                ...globals.node,
                Atomics: "readonly",
                SharedArrayBuffer: "readonly"
            },
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            "camelcase": "off",
            "prefer-const": "warn",
            "no-console": "error",
            "no-useless-escape": "error",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["warn", {
                argsIgnorePattern: "^_"
            }],
            "dot-notation": "off",
            "@typescript-eslint/dot-notation": ["error"],
            "@typescript-eslint/promise-function-async": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/no-floating-promises": "warn",

            "@stylistic/indent": ["error", 4, {
                SwitchCase: 1,
                VariableDeclarator: "first",
                FunctionExpression: {
                    parameters: "first"
                },
                CallExpression: {
                    arguments: "first"
                },
                ArrayExpression: "first",
                ObjectExpression: "first",
                ImportDeclaration: "first"
            }],
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/linebreak-style": ["error", "unix"],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "never"],
            "@stylistic/spaced-comment": "warn",
            "@stylistic/eol-last": "error",
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/object-curly-spacing": ["warn", "always"],
            "@stylistic/comma-spacing": "warn",
            "@stylistic/type-annotation-spacing": "warn",
            "@stylistic/keyword-spacing": ["warn", {
                before: true,
                after: true
            }],
            "@stylistic/no-multiple-empty-lines": ["error", {
                max: 2,
                maxBOF: 0,
                maxEOF: 0
            }],
            "@stylistic/member-delimiter-style": ["error", {
                multiline: {
                    delimiter: "none",
                    requireLast: false
                },
                singleline: {
                    delimiter: "comma",
                    requireLast: false
                }
            }]
        }
    }
)
