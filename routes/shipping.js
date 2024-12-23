// In routes/shipping.js (create a new file for shipping routes)
const axios = require('axios');

router.post('/create-shipment', async (req, res) => {
    const { orderDetails } = req.body;
    try {
        const response = await axios.post('https://api.shiprocket.in/v1/external/orders/create', orderDetails, {
            headers: {
                'Authorization': `Bearer ${process.env.SHIPROCKET_API_KEY}`
            }
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating shipment', error: error.message });
    }
});