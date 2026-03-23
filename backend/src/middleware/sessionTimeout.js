const ONE_HOUR_MS = 60 * 60 * 1000;

function sessionTimeout(req, res, next) {
  if (!req.session) return next();

  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  if (now - lastActivity > ONE_HOUR_MS) {
    return req.session.destroy(() => {
      res.status(440).json({ message: 'Sessão expirada por inatividade' });
    });
  }

  req.session.lastActivity = now;
  next();
}

module.exports = {
  ONE_HOUR_MS,
  sessionTimeout,
};
