const fs = require('fs');
const path = require('path');

// Calculate bill splits
const calculateBillSplit = (items, friends) => {
  const totals = {};
  
  // Initialize totals for each friend
  friends.forEach(friend => {
    totals[friend.id] = 0;
  });
  
  // Calculate splits for each item
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
  
  return totals;
};

// Calculate total bill amount
const calculateTotalBill = (items) => {
  return items.reduce((sum, item) => sum + (item.price || 0), 0);
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Generate bill summary
const generateBillSummary = (items, friends) => {
  const totals = calculateBillSplit(items, friends);
  const totalBill = calculateTotalBill(items);
  
  const splits = friends.map(friend => ({
    friendId: friend.id,
    friendName: friend.name,
    amount: totals[friend.id] || 0,
    formattedAmount: formatCurrency(totals[friend.id] || 0)
  }));
  
  return {
    totalBill,
    formattedTotalBill: formatCurrency(totalBill),
    splits,
    itemCount: items.length,
    friendCount: friends.length
  };
};

// Clean up old files
const cleanupOldFiles = (directory, maxAgeInDays = 7) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);
  
  let deletedCount = 0;
  
  try {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  return deletedCount;
};

// Validate file type
const isValidImageFile = (mimetype) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowedTypes.includes(mimetype);
};

// Generate unique filename
const generateUniqueFilename = (originalName, prefix = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  return `${prefix}${timestamp}_${random}${extension}`;
};

module.exports = {
  calculateBillSplit,
  calculateTotalBill,
  formatCurrency,
  generateBillSummary,
  cleanupOldFiles,
  isValidImageFile,
  generateUniqueFilename
};