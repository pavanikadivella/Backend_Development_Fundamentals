const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Route 1: Welcome page
app.get('/', (req, res) => {
    res.status(200).send('Welcome to my Node.js and Express server!');
});

// Route 2: About page
app.get('/about', (req, res) => {
    res.status(200).json({
        name: 'Pavani',
        section: 'CSE(Gen-AI)-2A'
    });
});

// Route 3: Current date and time
app.get('/time', (req, res) => {
    res.status(200).json({
        currentDateTime: new Date()
    });
});

// Route 4: Handle unknown routes
app.use((req, res) => {
    res.status(404).send('404 - Page not found');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});