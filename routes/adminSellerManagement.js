// In routes/adminSellerManagement.js
const express = require('express');
const Seller = require('../models/seller'); // Adjust the path to your Seller schema
const router = express.Router();

// Get all sellers
router.get('/sellers', async (req, res) => {
    try {
        const sellers = await Seller.find();
        res.status(200).json({
            success: true,
            sellers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sellers',
            error: error.message
        });
    }
});

// Update seller details
router.put('/sellers/:sellerId', async (req, res) => {
    const { sellerId } = req.params;
    const updates = req.body;

    try {
        const updatedSeller = await Seller.findOneAndUpdate({ sellerId }, updates, { new: true });
        if (!updatedSeller) {
            return res.status(404).json({ success: false, message: 'Seller not found' });
        }
        res.status(200).json({ success: true, message: 'Seller updated successfully', seller: updatedSeller });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating seller', error: error.message });
    }
});

// Delete seller
router.delete('/sellers/:sellerId', async (req, res) => {
    const { sellerId } = req.params;

    try {
        const deletedSeller = await Seller.findOneAndDelete({ sellerId });
        if (!deletedSeller) {
            return res.status(404).json({ success: false, message: 'Seller not found' });
        }
        res.status(200).json({ success: true, message: 'Seller deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting seller', error: error.message });
    }
});

module.exports = router;