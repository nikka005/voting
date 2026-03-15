import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Auth helpers
export const getToken = () => localStorage.getItem('lumina_token');
export const getUser = () => {
  const user = localStorage.getItem('lumina_user');
  return user ? JSON.parse(user) : null;
};
export const setAuth = (token, user) => {
  localStorage.setItem('lumina_token', token);
  localStorage.setItem('lumina_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('lumina_token');
  localStorage.removeItem('lumina_user');
};
export const isAuthenticated = () => !!getToken();
export const isAdmin = () => getUser()?.role === 'admin';
export const isContestant = () => getUser()?.role === 'contestant';

// Format helpers
export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Placeholder images - vibrant studio portraits
export const placeholderImages = [
  'https://images.unsplash.com/photo-1607332646821-cd217e4faf64?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
  'https://images.unsplash.com/photo-1607332646791-929f9ddcf96a?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
  'https://images.unsplash.com/photo-1653256170871-d0a26c41f49c?crop=entropy&cs=srgb&fm=jpg&q=85&w=400',
];

export const getPlaceholderImage = (index = 0) => {
  return placeholderImages[index % placeholderImages.length];
};
