/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{astro,js,ts,jsx,tsx}",
        "./public/**/*.html"
    ],
    theme: {
        extend: {},
    },
    plugins: [require('daisyui')],
};
