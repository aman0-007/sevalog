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

// Nested asset recovery: In case any client requests assets relative to nested paths (e.g. /reset-password/.../login.css or /reset-password/js/api.js)
app.use((req, res, next) => {
    if (/\.(css|js|png|jpg|jpeg|svg|ico|json|woff|woff2|map)$/i.test(req.path)) {
        const jsMatch = req.path.match(/\/(js\/[^\/]+)$/);
        if (jsMatch) {
            const candidate = path.join(__dirname, jsMatch[1]);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return res.sendFile(candidate);
            }
        }
        const frontendMatch = req.path.match(/\/(frontend\/[^\/]+)$/);
        if (frontendMatch) {
            const candidate = path.join(__dirname, frontendMatch[1]);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return res.sendFile(candidate);
            }
        }
        const filenameMatch = req.path.match(/\/([^\/]+\.(?:css|js|png|svg|ico|json))$/);
        if (filenameMatch) {
            const fname = filenameMatch[1];
            const inFrontend = path.join(__dirname, 'frontend', fname);
            if (fs.existsSync(inFrontend) && fs.statSync(inFrontend).isFile()) {
                return res.sendFile(inFrontend);
            }
            const inJs = path.join(__dirname, 'js', fname);
            if (fs.existsSync(inJs) && fs.statSync(inJs).isFile()) {
                return res.sendFile(inJs);
            }
        }
    }
    next();
});

// Route handlers for direct clean URLs and subpath parameters
// Reset Password: handle /reset-password, /frontend/reset-password, /reset-password.html, /frontend/reset-password.html and any nested :userId/:token paths
app.get(/^\/(?:frontend\/)?reset-password(?:\.html)?(?:\/.*)?$/, (req, res, next) => {
    if (/\.(css|js|png|jpg|jpeg|svg|ico|json|woff|woff2|map)$/i.test(req.path)) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'frontend', 'reset-password.html'));
});

// Forgot Password
app.get(/^\/(?:frontend\/)?forgot-password(?:\.html)?(?:\/.*)?$/, (req, res, next) => {
    if (/\.(css|js|png|jpg|jpeg|svg|ico|json|woff|woff2|map)$/i.test(req.path)) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'frontend', 'forgot-password.html'));
});

// Verify Certificate: handle clean URLs and subpaths
app.get(/^\/(?:frontend\/)?verify(?:\.html)?(?:\/.*)?$/, (req, res, next) => {
    if (/\.(css|js|png|jpg|jpeg|svg|ico|json|woff|woff2|map)$/i.test(req.path)) {
        return next();
    }
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
