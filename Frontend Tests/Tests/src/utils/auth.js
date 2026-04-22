// Authentication utility functions using cookies
export const authService = {
  // Check if user is authenticated (cookies are handled by browser)
  isAuthenticated: () => {
    // Consider authenticated if any cookie is present; backend controls validity
    return document.cookie && document.cookie.length > 0;
  },

  // Remove auth cookie
  removeToken: () => {
    // Set cookie with past expiration date to delete it
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  },
};
