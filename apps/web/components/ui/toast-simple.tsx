import React from 'react';

// Simple toast replacement for testing
export const Toaster = () => null;

export const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.log('Error:', message),
  info: (message: string) => console.log('Info:', message),
};