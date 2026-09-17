const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());

// Explicitly prevent HTTP caching for service worker file so browsers immediately see updates
app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve static assets from the root directory
app.use(express.static(path.join(__dirname), {
    extensions: ['html', 'htm']
}));

// Fallback static resolution for files referenced without /frontend prefix
app.use(express.static(path.join(__dirname, 'frontend'), {
    extensions: ['html', 'htm']
}));
app.use(express.static(path.join(__dirname, 'frontend', 'admin'), {
    extensions: ['html', 'htm']
}));
app.use(express.static(path.join(__dirname, 'frontend', 'volunteer'), {
    extensions: ['html', 'htm']
}));

// Route fallback helper for direct clean URLs
app.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'verify.html'));
});

app.get('/verify/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'verify.html'));
});

app.use((req, res, next) => {
    const frontendPath = path.join(__dirname, 'frontend', req.path);
    if (fs.existsSync(frontendPath) && fs.statSync(frontendPath).isFile()) {
        return res.sendFile(frontendPath);
    }
    const frontendHtmlPath = path.join(__dirname, 'frontend', req.path + '.html');
    if (fs.existsSync(frontendHtmlPath)) {
        return res.sendFile(frontendHtmlPath);
    }
    next();
});

// Custom 404 handler
app.use((req, res) => {
    const custom404 = path.join(__dirname, 'frontend', '404.html');
    if (fs.existsSync(custom404)) {
        res.status(404).sendFile(custom404);
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SevaLog server running on http://0.0.0.0:${PORT}`);
});
