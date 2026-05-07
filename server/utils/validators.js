// Validation utilities for input sanitization and validation
import validator from 'validator';

export const validateEmail = (email) => {
  return validator.isEmail(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password);
};

export const getPasswordStrengthMessage = (password) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain number';
  }
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must contain special character (@$!%*?&)';
  }
  return 'Password is strong';
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return validator.trim(validator.escape(input));
};

export const validateName = (name) => {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 100;
};

export const validateCollege = (college) => {
  const sanitized = sanitizeInput(college);
  return sanitized.length >= 2 && sanitized.length <= 200;
};

export const validateSkills = (skills) => {
  if (!Array.isArray(skills)) return false;
  if (skills.length === 0 || skills.length > 20) return false;
  return skills.every(skill => {
    const sanitized = sanitizeInput(skill);
    return sanitized.length >= 2 && sanitized.length <= 50;
  });
};

export const validateYear = (year) => {
  return ['1st', '2nd', '3rd', '4th'].includes(year);
};

export const validateHoursPerWeek = (hours) => {
  const num = parseInt(hours);
  return num > 0 && num <= 168; // max hours in a week
};

export const validateUrl = (url) => {
  if (!url) return true; // optional field
  return validator.isURL(url, { require_protocol: true });
};

export const validatePhone = (phone) => {
  if (!phone) return true; // optional
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
};

export const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return sanitizeInput(item);
    if (typeof item === 'object') return sanitizeObject(item);
    return item;
  });
};

export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeInput(obj[key]);
    } else if (typeof obj[key] === 'object') {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};
