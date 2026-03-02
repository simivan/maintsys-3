'use strict';
// middleware/roles.js – Provera uloge korisnika (role-based access control)

/**
 * Vraća middleware koji dozvoljava pristup samo navedenim ulogama.
 * Mora se koristiti NAKON requireAuth.
 *
 * Primer: router.put('/:id', requireAuth, allow('admin','menadzer'), handler)
 */
function allow(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Nije autorizovano.' });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({
      error: `Ova akcija zahteva jednu od uloga: ${roles.join(', ')}.`
    });
  };
}

// Često korišćeni skupovi uloga
const canWrite  = allow('admin', 'menadzer', 'operater');
const canManage = allow('admin', 'menadzer');
const adminOnly = allow('admin');
const canView   = allow('admin', 'menadzer', 'operater', 'gost');

module.exports = { allow, canWrite, canManage, adminOnly, canView };
