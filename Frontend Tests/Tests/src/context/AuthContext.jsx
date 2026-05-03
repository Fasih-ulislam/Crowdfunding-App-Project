import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);      // { id, email, role }
    const [loading, setLoading] = useState(true); // true while checking session

    // On mount, check if cookie session exists
    const checkSession = useCallback(async () => {
        try {
            const { data } = await authAPI.me();
            setUser(data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = (userData) => setUser(userData);

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch {
            // Even if request fails, clear local state
        } finally {
            setUser(null);
        }
    };

    const isRole = (role) => user?.role === role;

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isRole, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
