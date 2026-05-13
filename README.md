# 007-Pikmin

PWA mobile-first padre & figlio. Missioni, chat segreta, radar Pikmin.

## PIN demo
- Papà / Admin: **0077**
- Lorenzo / Agente: **1234**

Cambia i PIN in `src/lib/session.ts`.

## Stack
React 19 · TanStack Start · TailwindCSS v4 · Framer Motion · Lovable Cloud (Supabase) · PWA.

## Schermate
Login, Base Segreta, Chat Segreta, Missioni, Radar Pikmin, Premi, Archivio Ricordi, Profilo Agente.

## Database (Lovable Cloud)
Tabelle: `messages`, `missions`, `rewards`, `memories`. Realtime attivo su `messages` e `missions`.
