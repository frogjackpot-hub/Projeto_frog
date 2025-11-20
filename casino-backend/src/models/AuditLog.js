const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AuditLog {
  constructor(data) {
    this.id = data.id;
    this.adminId = data.admin_id;
    this.action = data.action;
    this.resourceType = data.resource_type;
    this.resourceId = data.resource_id;
    this.details = data.details;
    this.ipAddress = data.ip_address;
    this.userAgent = data.user_agent;
    this.createdAt = data.created_at;
  }

  /**
   * Criar um novo log de auditoria
   */
  static async create(logData) {
    try {
      const id = uuidv4();
      const query = `
        INSERT INTO audit_logs (
          id, admin_id, action, resource_type, resource_id, 
          details, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        id,
        logData.adminId,
        logData.action,
        logData.resourceType,
        logData.resourceId || null,
        JSON.stringify(logData.details || {}),
        logData.ipAddress,
        logData.userAgent
      ];

      const result = await db.query(query, values);
      return new AuditLog(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Buscar logs com filtros e paginação
   */
  static async findAll(options = {}) {
    try {
      const {
        adminId,
        action,
        resourceType,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = options;

      let query = `
        SELECT al.*, u.email as admin_email, u.username as admin_username
        FROM audit_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      if (adminId) {
        query += ` AND al.admin_id = $${paramCount}`;
        values.push(adminId);
        paramCount++;
      }

      if (action) {
        query += ` AND al.action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }

      if (resourceType) {
        query += ` AND al.resource_type = $${paramCount}`;
        values.push(resourceType);
        paramCount++;
      }

      if (startDate) {
        query += ` AND al.created_at >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND al.created_at <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await db.query(query, values);
      return result.rows.map(row => ({
        ...new AuditLog(row),
        adminEmail: row.admin_email,
        adminUsername: row.admin_username
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Contar total de logs com filtros
   */
  static async count(options = {}) {
    try {
      const { adminId, action, resourceType, startDate, endDate } = options;

      let query = 'SELECT COUNT(*) FROM audit_logs WHERE 1=1';
      const values = [];
      let paramCount = 1;

      if (adminId) {
        query += ` AND admin_id = $${paramCount}`;
        values.push(adminId);
        paramCount++;
      }

      if (action) {
        query += ` AND action = $${paramCount}`;
        values.push(action);
        paramCount++;
      }

      if (resourceType) {
        query += ` AND resource_type = $${paramCount}`;
        values.push(resourceType);
        paramCount++;
      }

      if (startDate) {
        query += ` AND created_at >= $${paramCount}`;
        values.push(startDate);
        paramCount++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramCount}`;
        values.push(endDate);
        paramCount++;
      }

      const result = await db.query(query, values);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuditLog;
