const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory storage (replace with database in production)
let bills = [];
let billSessions = new Map();

// Validation middleware
const validateBill = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
  body('friends').isArray().withMessage('Friends must be an array'),
  body('friends.*.name').notEmpty().withMessage('Friend name is required'),
];

const validateBillSession = [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
];

// Create a new bill session
router.post('/session', (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      friends: [],
      splits: [],
      status: 'draft'
    };
    
    billSessions.set(sessionId, session);
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create bill session',
      message: error.message
    });
  }
});

// Get bill session
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = billSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested bill session does not exist.'
      });
    }
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bill session',
      message: error.message
    });
  }
});

// Update bill session items
router.put('/session/:sessionId/items', [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { sessionId } = req.params;
    const { items } = req.body;
    const session = billSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested bill session does not exist.'
      });
    }
    
    // Add IDs to items if they don't have them
    const itemsWithIds = items.map(item => ({
      ...item,
      id: item.id || uuidv4()
    }));
    
    session.items = itemsWithIds;
    session.updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update items',
      message: error.message
    });
  }
});

// Update bill session friends
router.put('/session/:sessionId/friends', [
  body('friends').isArray().withMessage('Friends must be an array'),
  body('friends.*.name').notEmpty().withMessage('Friend name is required'),
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { sessionId } = req.params;
    const { friends } = req.body;
    const session = billSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested bill session does not exist.'
      });
    }
    
    // Add IDs to friends if they don't have them
    const friendsWithIds = friends.map(friend => ({
      ...friend,
      id: friend.id || uuidv4()
    }));
    
    session.friends = friendsWithIds;
    session.updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update friends',
      message: error.message
    });
  }
});

// Calculate and save bill split
router.post('/session/:sessionId/calculate', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = billSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested bill session does not exist.'
      });
    }
    
    // Calculate splits
    const totals = {};
    session.friends.forEach(friend => {
      totals[friend.id] = 0;
    });
    
    session.items.forEach(item => {
      if (item.sharedWith && item.sharedWith.length > 0) {
        const splitAmount = item.price / item.sharedWith.length;
        item.sharedWith.forEach(friendId => {
          if (totals[friendId] !== undefined) {
            totals[friendId] += splitAmount;
          }
        });
      }
    });
    
    const splits = session.friends.map(friend => ({
      friendId: friend.id,
      friendName: friend.name,
      amount: totals[friend.id] || 0
    }));
    
    const totalBill = session.items.reduce((sum, item) => sum + item.price, 0);
    
    session.splits = splits;
    session.totalAmount = totalBill;
    session.status = 'calculated';
    session.updatedAt = new Date().toISOString();
    
    res.json({
      success: true,
      data: {
        session,
        calculation: {
          totalBill,
          splits,
          calculatedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate bill split',
      message: error.message
    });
  }
});

// Save final bill
router.post('/', validateBill, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { items, friends, sessionId } = req.body;
    const billId = uuidv4();
    
    // Calculate totals
    const totals = {};
    friends.forEach(friend => {
      totals[friend.id] = 0;
    });
    
    items.forEach(item => {
      if (item.sharedWith && item.sharedWith.length > 0) {
        const splitAmount = item.price / item.sharedWith.length;
        item.sharedWith.forEach(friendId => {
          if (totals[friendId] !== undefined) {
            totals[friendId] += splitAmount;
          }
        });
      }
    });
    
    const totalBill = items.reduce((sum, item) => sum + item.price, 0);
    
    const bill = {
      id: billId,
      sessionId: sessionId || null,
      items,
      friends,
      totals,
      totalBill,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    bills.push(bill);
    
    res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to save bill',
      message: error.message
    });
  }
});

// Get all bills
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    
    const paginatedBills = bills.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedBills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(bills.length / limit),
        totalItems: bills.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bills',
      message: error.message
    });
  }
});

// Get specific bill
router.get('/:billId', (req, res) => {
  try {
    const { billId } = req.params;
    const bill = bills.find(b => b.id === billId);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
        message: 'The requested bill does not exist.'
      });
    }
    
    res.json({
      success: true,
      data: bill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bill',
      message: error.message
    });
  }
});

// Delete bill
router.delete('/:billId', (req, res) => {
  try {
    const { billId } = req.params;
    const billIndex = bills.findIndex(b => b.id === billId);
    
    if (billIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Bill not found',
        message: 'The requested bill does not exist.'
      });
    }
    
    bills.splice(billIndex, 1);
    
    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete bill',
      message: error.message
    });
  }
});

module.exports = router;