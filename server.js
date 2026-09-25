import 'dotenv/config';
import express from 'express';
import sql from 'mssql';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// GET: Consultar misiones
app.get('/api/misiones', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query('SELECT * FROM Misiones');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Consultar estudiantes con misiones
app.get('/api/estudiantes', async (req, res) => {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query(`
      SELECT e.Carnet as carnet, e.Nombre as nombre, e.Correo as correo,
             em.MisionID as misionId, em.Estado as estado
      FROM Estudiantes e
      LEFT JOIN EstudianteMisiones em ON e.Carnet = em.Carnet
    `);

    const estudiantesMap = {};
    result.recordset.forEach(row => {
      if (!estudiantesMap[row.carnet]) {
        estudiantesMap[row.carnet] = {
          carnet: row.carnet,
          nombre: row.nombre,
          correo: row.correo,
          misiones: []
        };
      }
      if (row.misionId !== null) {
        estudiantesMap[row.carnet].misiones.push({
          misionId: row.misionId,
          estado: Boolean(row.estado)
        });
      }
    });

    res.json(Object.values(estudiantesMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Registrar / Actualizar maestro-detalle
app.post('/api/registro', async (req, res) => {
  const { maestro, detalle } = req.body;
  if (!maestro || !detalle || !maestro.carnet) {
    return res.status(400).json({ error: 'Datos de entrada no válidos.' });
  }

  let pool = await sql.connect(config);
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // Validar misiones existentes
    const misionesVal = await new sql.Request(transaction).query('SELECT MisionID FROM Misiones');
    const idsValidos = misionesVal.recordset.map(m => m.MisionID);

    for (let item of detalle) {
      if (!idsValidos.includes(item.misionId)) {
        await transaction.rollback();
        return res.status(400).json({ error: `Error de referencia: MisionId ${item.misionId} no existe.` });
      }
    }

    // Insertar/Actualizar Estudiante
    const estReq = new sql.Request(transaction);
    estReq.input('carnet', sql.VarChar, maestro.carnet);
    estReq.input('nombre', sql.NVarChar, maestro.nombre);
    estReq.input('correo', sql.NVarChar, maestro.correo);

    const checkEst = await estReq.query('SELECT Carnet FROM Estudiantes WHERE Carnet = @carnet');
    if (checkEst.recordset.length > 0) {
      await estReq.query('UPDATE Estudiantes SET Nombre = @nombre, Correo = @correo WHERE Carnet = @carnet');
    } else {
      await estReq.query('INSERT INTO Estudiantes (Carnet, Nombre, Correo) VALUES (@carnet, @nombre, @correo)');
    }

    // Insertar/Actualizar Detalle
    for (let item of detalle) {
      const detReq = new sql.Request(transaction);
      detReq.input('carnet', sql.VarChar, maestro.carnet);
      detReq.input('misionId', sql.Int, item.misionId);
      detReq.input('estado', sql.Bit, item.estado ? 1 : 0);

      const checkDet = await detReq.query('SELECT DetalleID FROM EstudianteMisiones WHERE Carnet = @carnet AND MisionID = @misionId');
      if (checkDet.recordset.length > 0) {
        await detReq.query('UPDATE EstudianteMisiones SET Estado = @estado WHERE Carnet = @carnet AND MisionID = @misionId');
      } else {
        await detReq.query('INSERT INTO EstudianteMisiones (Carnet, MisionID, Estado) VALUES (@carnet, @misionId, @estado)');
      }
    }

    await transaction.commit();
    res.json({ mensaje: 'Estudiante y misiones procesados correctamente.', misionesProcesadas: detalle.length });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
});

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => console.log(`Servidor escuchando en puerto ${puerto}`));