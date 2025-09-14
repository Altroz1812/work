import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { AuthenticationError, AuthorizationError } from './errorHandler.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
  tenant?: {
    id: string;
    name: string;
    domain: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      throw new AuthenticationError('Access denied. No token provided.');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Fetch user details from database with tenant information
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, name, role, tenant_id, is_active,
        tenants!inner(id, name, domain, is_active)
      `)
      .eq('id', decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.warn('🔐 Invalid token attempt:', { 
        userId: decoded.id, 
        error: error?.message,
        ip: req.ip 
      });
      throw new AuthenticationError('Invalid or expired token.');
    }

    // Check if tenant is active
    if (!user.tenants.is_active) {
      throw new AuthenticationError('Tenant account is inactive.');
    }

    // Populate request with user and tenant context
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    };

    req.tenant = {
      id: user.tenants.id,
      name: user.tenants.name,
      domain: user.tenants.domain
    };

    // Update last login timestamp (fire and forget)
    supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) {
          console.warn('Failed to update last login:', error.message);
        }
      });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token format.'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired.'));
    } else {
      next(error);
    }
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      console.warn('🚫 Authorization failed:', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        endpoint: req.originalUrl
      });
      return next(new AuthorizationError('Access denied. Insufficient permissions.'));
    }

    next();
  };
};

export const validateTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  const tenantParam = req.params.tenant;
  
  if (!req.tenant) {
    return next(new AuthenticationError('Tenant context required.'));
  }

  // Allow both domain and ID for tenant parameter
  if (tenantParam !== req.tenant.domain && tenantParam !== req.tenant.id) {
    console.warn('🏢 Invalid tenant access attempt:', {
      userId: req.user?.id,
      requestedTenant: tenantParam,
      userTenant: req.tenant.domain,
      ip: req.ip
    });
    return next(new AuthorizationError('Access denied. Invalid tenant context.'));
  }

  next();
};

// Middleware to check if user has specific permissions for a resource
export const checkResourceAccess = (resourceType: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      
      // Example: Check if user can access a specific case
      if (resourceType === 'case') {
        const { data: caseData, error } = await supabase
          .from('cases')
          .select('assigned_to, created_by')
          .eq('id', resourceId)
          .eq('tenant_id', req.user!.tenantId)
          .single();

        if (error || !caseData) {
          return next(new AuthorizationError('Resource not found or access denied.'));
        }

        // Allow access if user is assigned to the case, created it, or is an admin
        const hasAccess = req.user!.role === 'Admin' ||
                         caseData.assigned_to === req.user!.id ||
                         caseData.created_by === req.user!.id;

        if (!hasAccess) {
          return next(new AuthorizationError('Access denied to this resource.'));
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};