const { body, param, query } = require('express-validator');

// Common validation rules
const validateUUID = (field) => {
  return param(field).isUUID().withMessage(`${field} must be a valid UUID`);
};

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

const validateBillItem = [
  body('name').notEmpty().trim().withMessage('Item name is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('sharedWith').optional().isArray().withMessage('SharedWith must be an array')
];

const validateFriend = [
  body('name').notEmpty().trim().withMessage('Friend name is required'),
  body('color').optional().isString().withMessage('Color must be a string')
];

const validateBillSession = [
  body('items').optional().isArray().withMessage('Items must be an array'),
  body('friends').optional().isArray().withMessage('Friends must be an array'),
  body('items.*').custom((item) => {
    if (typeof item !== 'object') {
      throw new Error('Each item must be an object');
    }
    if (!item.name || typeof item.name !== 'string') {
      throw new Error('Item name is required and must be a string');
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      throw new Error('Item price must be a positive number');
    }
    return true;
  }),
  body('friends.*').custom((friend) => {
    if (typeof friend !== 'object') {
      throw new Error('Each friend must be an object');
    }
    if (!friend.name || typeof friend.name !== 'string') {
      throw new Error('Friend name is required and must be a string');
    }
    return true;
  })
];

module.exports = {
  validateUUID,
  validatePagination,
  validateBillItem,
  validateFriend,
  validateBillSession
};