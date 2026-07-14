const entryService = require('../services/entry.service');

exports.verifyAndLog = async (req, res, next) => {
  try {
    const result = await entryService.verifyAndLog({ ...req.body, checked_by: req.user.id });
    const status = result.allowed ? 200 : 422;
    res.status(status).json({ success: result.allowed, data: result });
  } catch (err) { next(err); }
};
