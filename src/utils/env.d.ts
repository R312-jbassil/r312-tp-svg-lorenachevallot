/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        lang: 'en' | 'fr';
        user?: any; // Utilisateur connecté via PocketBase
    }
}