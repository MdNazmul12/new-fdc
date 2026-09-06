'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextProps {
  user: User | null;
  role: UserRole | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (module: string, action: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'print') => boolean;
  loading: boolean;
  permissions: Record<UserRole, Record<string, string[]>>;
  updateRolePermission: (role: UserRole, module: string, action: string, grant: boolean) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Default Static Permissions Configuration
const DEFAULT_PERMISSIONS: Record<UserRole, Record<string, string[]>> = {
  super_admin: {
    dashboard: ['view'],
    members: ['view', 'create', 'update', 'delete', 'export'],
    collections: ['view', 'create', 'update', 'delete', 'export', 'print'],
    investments: ['view', 'create', 'update', 'delete', 'approve', 'export'],
    expenses: ['view', 'create', 'update', 'delete', 'export'],
    accounting: ['view', 'create', 'update', 'delete', 'export'],
    reports: ['view', 'export'],
    users: ['view', 'create', 'update', 'delete'],
    audit: ['view'],
    documents: ['view', 'create', 'delete']
  },
  president: {
    dashboard: ['view'],
    members: ['view', 'export'],
    collections: ['view'],
    investments: ['view', 'create', 'update', 'approve', 'export'],
    expenses: ['view'],
    accounting: ['view'],
    reports: ['view', 'export'],
    users: ['view'],
    audit: ['view'],
    documents: ['view']
  },
  treasurer: {
    dashboard: ['view'],
    members: ['view'],
    collections: ['view', 'create', 'update', 'export', 'print'],
    investments: ['view', 'create', 'update', 'export'],
    expenses: ['view', 'create', 'update', 'delete', 'export'],
    accounting: ['view', 'create', 'update', 'delete', 'export'],
    reports: ['view', 'export'],
    users: [],
    audit: [],
    documents: ['view', 'create', 'delete']
  },
  collector: {
    dashboard: ['view'],
    members: ['view'],
    collections: ['view', 'create', 'print'],
    investments: [],
    expenses: [],
    accounting: [],
    reports: [],
    users: [],
    audit: [],
    documents: ['view', 'create']
  },
  auditor: {
    dashboard: ['view'],
    members: ['view'],
    collections: ['view'],
    investments: ['view'],
    expenses: ['view'],
    accounting: ['view'],
    reports: ['view', 'export'],
    users: [],
    audit: ['view'],
    documents: ['view']
  },
  member: {
    dashboard: ['view'],
    members: ['view'],
    collections: ['view', 'print'],
    investments: [],
    expenses: [],
    accounting: [],
    reports: [],
    users: [],
    audit: [],
    documents: []
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<UserRole, Record<string, string[]>>>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    const initSessionAndPermissions = async () => {
      if (typeof window === 'undefined') return;

      // 1. Load User Session and sync with MongoDB
      const storedUser = localStorage.getItem('fdc_current_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser); // Temporary optimistic set
          
          // Refetch from MongoDB to check active status and updated roles in real-time
          fetch('/api/db/users')
            .then(res => res.ok ? res.json() : null)
            .then(usersList => {
              if (usersList && Array.isArray(usersList)) {
                const freshUser = usersList.find(u => u.id === parsedUser.id);
                if (freshUser) {
                  if (freshUser.status === 'locked') {
                    setUser(null);
                    localStorage.removeItem('fdc_current_user');
                    alert('Your account has been locked by administration.');
                  } else {
                    setUser(freshUser);
                    localStorage.setItem('fdc_current_user', JSON.stringify(freshUser));
                  }
                }
              }
            })
            .catch(err => console.warn('Could not sync user details with MongoDB on mount:', err));
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Load permissions from MongoDB
      try {
        const res = await fetch('/api/db/permissions');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const loadedPerms: any = {};
            data.forEach((item: any) => {
              loadedPerms[item.role] = item.modules;
            });
            setPermissions(loadedPerms);
            localStorage.setItem('fdc_permissions', JSON.stringify(loadedPerms));
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch permissions from MongoDB. Using local storage fallback.', e);
      }

      // LocalStorage Fallback for permissions
      const storedPerms = localStorage.getItem('fdc_permissions');
      if (storedPerms) {
        try {
          setPermissions(JSON.parse(storedPerms));
        } catch (e) {
          setPermissions(DEFAULT_PERMISSIONS);
        }
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
        localStorage.setItem('fdc_permissions', JSON.stringify(DEFAULT_PERMISSIONS));
      }
      setLoading(false);
    };

    initSessionAndPermissions();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    let usersList: User[] = [];
    
    // Fetch fresh users directly from MongoDB to allow newly added users to log in instantly
    try {
      const res = await fetch('/api/db/users');
      if (res.ok) {
        usersList = await res.json();
      }
    } catch (err) {
      console.warn('Could not fetch dynamic users from MongoDB on login. Falling back to local storage.', err);
    }

    if (!usersList || usersList.length === 0) {
      if (typeof window !== 'undefined') {
        const storedUsersText = localStorage.getItem('fdc_users');
        if (storedUsersText) {
          try {
            usersList = JSON.parse(storedUsersText);
          } catch (e) {}
        }
      }
    }

    if (!usersList || usersList.length === 0) {
      usersList = [
        { id: 'u-1', name: 'Super Admin', email: 'admin@fdc.org', role: 'super_admin', status: 'active', password: 'password123' },
        { id: 'u-2', name: 'President Account', email: 'president@fdc.org', role: 'president', status: 'active', password: 'password123' },
        { id: 'u-3', name: 'Treasurer Account', email: 'treasurer@fdc.org', role: 'treasurer', status: 'active', password: 'password123' },
        { id: 'u-4', name: 'Collector Account', email: 'collector@fdc.org', role: 'collector', status: 'active', password: 'password123' },
        { id: 'u-5', name: 'Auditor Account', email: 'auditor@fdc.org', role: 'auditor', status: 'active', password: 'password123' },
        { id: 'u-6', name: 'Kabir Ahmed', email: 'kabir@fdc.org', role: 'member', status: 'active', password: 'password123' },
      ];
    }

    const match = usersList.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (match) {
      if (match.status === 'locked') {
        alert('This user account has been locked by administration.');
        return false;
      }
      
      const expectedPassword = match.password || 'password123';
      if (password === expectedPassword) {
        const lastLoginTime = new Date().toLocaleString();
        const updatedUserObj = { ...match, lastLogin: lastLoginTime };
        
        // Update user lastLogin timestamp inside MongoDB asynchronously
        fetch('/api/db/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: { id: match.id },
            update: { lastLogin: lastLoginTime }
          })
        }).catch(err => console.error('Failed to sync login timestamp to MongoDB:', err));

        // Sync to local storage
        const updatedUsersList = usersList.map(u => u.id === match.id ? updatedUserObj : u);
        if (typeof window !== 'undefined') {
          localStorage.setItem('fdc_users', JSON.stringify(updatedUsersList));
          localStorage.setItem('fdc_current_user', JSON.stringify(updatedUserObj));
        }
        
        setUser(updatedUserObj);
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('fdc_current_user');
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const names: Record<UserRole, string> = {
      super_admin: 'Super Admin',
      president: 'President Account',
      treasurer: 'Treasurer Account',
      collector: 'Collector Account',
      auditor: 'Auditor Account',
      member: 'Kabir Ahmed (Member)'
    };
    
    const updatedUser = {
      ...user,
      name: names[newRole],
      role: newRole,
      email: newRole === 'member' ? 'kabir@fdc.org' : `${newRole}@fdc.org`
    };
    setUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
    }
  };

  const hasPermission = (
    module: string,
    action: 'view' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'print'
  ): boolean => {
    if (!user) return false;
    const rolePermissions = permissions[user.role];
    if (!rolePermissions) return false;
    const modulePermissions = rolePermissions[module];
    if (!modulePermissions) return false;
    return modulePermissions.includes(action);
  };

  const updateRolePermission = (roleToUpdate: UserRole, module: string, action: string, grant: boolean) => {
    setPermissions(prev => {
      const roleModulePermissions = prev[roleToUpdate] || {};
      const moduleActions = roleModulePermissions[module] || [];
      
      let newActions = [...moduleActions];
      if (grant) {
        if (!newActions.includes(action)) {
          newActions.push(action);
        }
      } else {
        newActions = newActions.filter(a => a !== action);
      }

      const updatedRoleModules = {
        ...roleModulePermissions,
        [module]: newActions
      };

      const updated = {
        ...prev,
        [roleToUpdate]: updatedRoleModules
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('fdc_permissions', JSON.stringify(updated));
      }

      // Sync role permissions document changes directly to MongoDB
      fetch('/api/db/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter: { role: roleToUpdate },
          update: { role: roleToUpdate, modules: updatedRoleModules }
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.matchedCount === 0) {
            // Seed/insert this role permission if not found
            fetch('/api/db/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: roleToUpdate, modules: updatedRoleModules })
            });
          }
        })
        .catch(err => console.error('Failed to sync permission updates to MongoDB:', err));

      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        login,
        logout,
        switchRole,
        hasPermission,
        loading,
        permissions,
        updateRolePermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
