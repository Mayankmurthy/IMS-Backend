const jwt = require('jsonwebtoken');
 
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
 
    if (!token) {
        return res.status(401).json({ error: "Authentication token required. Please log in." });
    }
 
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        console.log("Decoded Token:", user); 
        req.user = user;
        next();
    });
    
};


const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            console.error(`Role missing in token:`, req.user);
            return res.status(403).json({ error: 'Forbidden: User role not defined or authenticated.' });
        }

        console.log(`Checking role:`, req.user.role); 
        if (!roles.includes(req.user.role)) {
            console.error(`Role mismatch: Expected one of ${roles.join(', ')}, found ${req.user.role}`); 
            return res.status(403).json({ error: `Access denied. Requires one of these roles: ${roles.join(', ')}` });
        }

        next();
    };
};

 
module.exports = { authenticateToken, authorizeRoles };
 