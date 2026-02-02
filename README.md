# melomoney

## Stack

Backend

✅ FastAPI + PostgreSQL

Frontend

✅ React + TypeScript
✅ Tailwind + shadcn/ui

Why?

* You learn real CSS concepts (flex, grid)
* You learn component composition
* You avoid vendor lock-in
* You learn what modern teams actually use

This stack is:

* Popular
* Transferable
* Not beginner-fluffy
* Not enterprise-bloated

## Create Project

Install required packages

* sudo pacman -S nodejs-lts-krypton npm

Create skeleton with vite

* npm create vite@latest
    * TypeScript + SWC

## Tailwind CSS

Install tailwind

* npm install tailwindcss @tailwindcss/vite

Configure vite

vite.config.ts
```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```
Import tailwind

index.css
```
@import "tailwindcss";
```
Delete not needed App.css and remove reference from App.tsx
