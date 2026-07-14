const pool = require('../config/database');

exports.listBuildings = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM buildings WHERE is_active = true ORDER BY name');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createBuilding = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    const { rows } = await pool.query('INSERT INTO buildings (name, address) VALUES ($1, $2) RETURNING *', [name, address || null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.listRooms = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rooms WHERE building_id = $1 AND is_active = true ORDER BY room_number', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

exports.createRoom = async (req, res, next) => {
  try {
    const { room_number, capacity } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO rooms (building_id, room_number, capacity) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, room_number, capacity]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};

exports.updateRoom = async (req, res, next) => {
  try {
    const { room_number, capacity } = req.body;
    const { rows } = await pool.query(
      'UPDATE rooms SET room_number = COALESCE($1, room_number), capacity = COALESCE($2, capacity), updated_at = NOW() WHERE id = $3 RETURNING *',
      [room_number, capacity, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Room not found' } });
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
};
