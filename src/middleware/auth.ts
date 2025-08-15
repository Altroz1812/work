import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Fetch user details from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*, tenants(*)')
      .eq('id', decoded.id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

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

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

export const validateTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  const tenantParam = req.params.tenant;
  
  if (!req.tenant) {
    return res.status(401).json({ success: false, message: 'Tenant context required.' });
  }

  if (tenantParam !== req.tenant.domain && tenantParam !== req.tenant.id) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Invalid tenant context.' 
    });
  }

  next();
};