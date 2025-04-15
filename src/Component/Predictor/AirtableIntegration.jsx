
// AirtableIntegration.jsx - Componente corregido para manejo de fechas diarias
import { useState, useEffect } from 'react';
import Airtable from 'airtable';

const AirtableIntegration = ({ onDataLoaded, onError }) => {
  const [loading, setLoading] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  
  // Configuración fija para Airtable
  const API_KEY = import.meta.env.VITE_APP_AIRTABLE_API_KEY || '';
  const BASE_ID = import.meta.env.VITE_APP_AIRTABLE_BASE_ID || '';
  const TABLE_NAME = 'Tabla1';
  const VIEW_NAME = 'Grid view';
  const DATE_FIELD = 'Fecha';
  const VALUE_FIELD = 'Variacion';
  
  // Función para cargar datos desde Airtable con mejor manejo de paginación
  const loadAirtableData = async () => {
    setLoading(true);
    setLoadedCount(0);
    
    try {
      // Inicializar Airtable con la API key predefinida
      const base = new Airtable({ apiKey: API_KEY }).base(BASE_ID);
      
      // Imprimir información de depuración
      console.log("Conectando a Airtable con:", {
        apiKey: API_KEY,
        baseId: BASE_ID,
        tableName: TABLE_NAME,
        viewName: VIEW_NAME
      });
            
      // Consultar todos los registros con una configuración que asegure cargar todo
      const allRecords = [];
      
      // Esta función es más robusta para cargar todos los registros
      await new Promise((resolve, reject) => {
        base(TABLE_NAME).select({
          view: VIEW_NAME,
          // Establecer un límite alto para asegurar que se cargan todos los registros
          maxRecords: 10000
        }).eachPage(
          function page(records, fetchNextPage) {
            console.log(`Recibidos ${records.length} registros de Airtable...`);
            allRecords.push(...records);
            setLoadedCount(prev => prev + records.length);
            
            // Llamar a fetchNextPage para obtener la siguiente página
            // Esto continuará hasta que no haya más registros
            fetchNextPage();
          },
          function done(err) {
            if (err) {
              console.error("Error al cargar registros:", err);
              reject(err);
              return;
            }
            console.log(`Completada la carga de ${allRecords.length} registros totales`);
            resolve();
          }
        );
      });
      
      // Si no hay registros, mostrar error
      if (!allRecords || allRecords.length === 0) {
        throw new Error("No se encontraron registros en la tabla especificada");
      }
      
      console.log("Registros cargados desde Airtable:", allRecords.length);
      
      // Procesar registros
      const processedData = allRecords.map(record => {
        const fields = record.fields;
        
        // Verificar que los campos necesarios existen
        if (!fields[DATE_FIELD] || fields[VALUE_FIELD] === undefined) {
          console.warn("Registro incompleto:", fields);
          return null;
        }
        
        // Depuración: ver el formato exacto de las fechas
        console.log(`Formato original de fecha para ${record.id}:`, fields[DATE_FIELD], typeof fields[DATE_FIELD]);
        
        // Intentar parsear la fecha
        let dateValue;
        try {
          // CORRECCIÓN: Manejo mejorado de fechas de Airtable
          if (typeof fields[DATE_FIELD] === 'string') {
            // Para formato de cadena, intentar varias opciones
            // Primero probar si es formato DD/MM/YYYY
            const dateParts = fields[DATE_FIELD].split('/');
            if (dateParts.length === 3) {
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1; // Meses indexados desde 0
              const year = parseInt(dateParts[2], 10);
              dateValue = new Date(year, month, day);
              console.log(`  → Formato DD/MM/YYYY detectado: ${day}/${month+1}/${year}`);
            } else {
              // Intentar como fecha ISO
              dateValue = new Date(fields[DATE_FIELD]);
              console.log(`  → Intentando como fecha ISO: ${dateValue}`);
            }
          } else if (fields[DATE_FIELD] instanceof Date) {
            // Si ya es un objeto Date
            dateValue = fields[DATE_FIELD];
            console.log(`  → Ya es un objeto Date: ${dateValue}`);
          } else if (Array.isArray(fields[DATE_FIELD])) {
            // A veces Airtable devuelve fechas como un array con un solo elemento
            const firstValue = fields[DATE_FIELD][0];
            dateValue = new Date(firstValue);
            console.log(`  → Fecha en array: ${dateValue}`);
          } else {
            // Último recurso: intentar parsear directamente
            dateValue = new Date(fields[DATE_FIELD]);
            console.log(`  → Parseo directo: ${dateValue}`);
          }
          
          // Verificar que la fecha es válida
          if (isNaN(dateValue.getTime())) {
            console.warn(`Fecha inválida para registro ${record.id}:`, fields[DATE_FIELD]);
            return null;
          }

          // PUNTO CRÍTICO: Asegurar que estamos usando la fecha completa con día
          const year = dateValue.getFullYear();
          const month = dateValue.getMonth();
          const day = dateValue.getDate();
          
          // Asegurar que el día es correcto y no el primer día del mes por defecto
          if (day === 1 && typeof fields[DATE_FIELD] === 'string') {
            // Si el día es 1 y la fecha original es una cadena, revisar si realmente es un valor diario
            if (!fields[DATE_FIELD].includes("1/")) {
              console.warn(`Posible pérdida de información de día en la fecha: ${fields[DATE_FIELD]}`);
            }
          }
          
          console.log(`  ✓ Fecha final para el registro ${record.id}: ${dateValue.toISOString()}`);
        } catch (e) {
          console.warn(`Error al parsear fecha para registro ${record.id}:`, fields[DATE_FIELD], e);
          return null;
        }
        
        // Intentar parsear el valor
        let value;
        try {
          if (typeof fields[VALUE_FIELD] === 'number') {
            value = fields[VALUE_FIELD];
          } else if (typeof fields[VALUE_FIELD] === 'string') {
            // Reemplazar comas por puntos si es necesario
            value = parseFloat(fields[VALUE_FIELD].replace(',', '.'));
          } else if (Array.isArray(fields[VALUE_FIELD])) {
            // Si es un array, intentar con el primer elemento
            const firstValue = fields[VALUE_FIELD][0];
            if (typeof firstValue === 'number') {
              value = firstValue;
            } else if (typeof firstValue === 'string') {
              value = parseFloat(firstValue.replace(',', '.'));
            }
          } else {
            value = parseFloat(fields[VALUE_FIELD]);
          }
          
          // Verificar que el valor es un número
          if (isNaN(value)) {
            console.warn(`Valor inválido para registro ${record.id}:`, fields[VALUE_FIELD]);
            return null;
          }
        } catch (e) {
          console.warn(`Error al parsear valor para registro ${record.id}:`, fields[VALUE_FIELD], e);
          return null;
        }
        
        return {
          date: dateValue,
          value: value,
          formattedDate: `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`,
          recordId: record.id
        };
      }).filter(item => item !== null);
      
      // IMPORTANTE: Verificar si hay fechas duplicadas (problema común con datos mensuales)
      const dateMap = new Map();
      const uniqueDates = [];
      
      // Identificar fechas duplicadas
      for (const item of processedData) {
        const dateString = item.formattedDate;
        if (!dateMap.has(dateString)) {
          dateMap.set(dateString, item);
          uniqueDates.push(item);
        } else {
          console.warn(`Fecha duplicada encontrada: ${dateString} (ID: ${item.recordId}). Se usará el primer valor.`);
        }
      }
      
      // Si encontramos duplicados, alertar
      if (uniqueDates.length < processedData.length) {
        console.warn(`Se detectaron ${processedData.length - uniqueDates.length} fechas duplicadas. Esto puede indicar un problema con el formato de fechas.`);
      }
      
      // Usar solo fechas únicas
      const finalData = uniqueDates;
      
      // Ordenar por fecha
      finalData.sort((a, b) => a.date - b.date);
      
      // Verificar que hay datos válidos después del procesamiento
      if (finalData.length === 0) {
        throw new Error("No se pudieron procesar datos válidos desde Airtable");
      }
      
      console.log(`Datos procesados finales: ${finalData.length} registros únicos`);
      
      // Mostrar los primeros y últimos registros para verificación
      if (finalData.length > 0) {
        console.log("Primer registro procesado:", finalData[0]);
        console.log("Último registro procesado:", finalData[finalData.length - 1]);
        
        // Verificar si los datos tienen frecuencia mensual o diaria
        if (finalData.length > 1) {
          const firstDate = new Date(finalData[0].date);
          const secondDate = new Date(finalData[1].date);
          const diffDays = Math.round((secondDate - firstDate) / (1000 * 60 * 60 * 24));
          
          console.log(`Diferencia entre las primeras dos fechas: ${diffDays} días`);
          
          if (diffDays >= 28 && diffDays <= 31) {
            console.warn("⚠️ Los datos parecen tener frecuencia mensual. La predicción podría no ser precisa si esperas frecuencia diaria.");
          } else if (diffDays === 1) {
            console.log("✓ Los datos parecen tener frecuencia diaria.");
          } else {
            console.log(`Los datos tienen una frecuencia de aproximadamente ${diffDays} días entre registros.`);
          }
        }
      }
      
      // Invocar callback con los datos procesados
      onDataLoaded(finalData);
      
    } catch (error) {
      console.error("Error al cargar datos desde Airtable:", error);
      onError(`Error al cargar datos desde Airtable: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="airtable-integration">
      <h3>Conexión con Airtable</h3>
      
      <div className="airtable-connection-info">
        <p>Conexión configurada para la base de datos:</p>
        <ul className="connection-details">
          <li><strong>Campos:</strong> {DATE_FIELD} (fecha), {VALUE_FIELD} (valor)</li>
        </ul>
      </div>
      
      <div className="button-group">
        <button
          onClick={loadAirtableData}
          disabled={loading}
          className={`btn btn-primary ${loading ? 'disabled' : ''}`}
        >
          {loading ? 'Cargando datos...' : 'Cargar datos de Airtable'}
        </button>
      </div>
      
      {loading && (
        <div className="loading-message">
          <p>Cargando datos desde Airtable, por favor espere...</p>
          {loadedCount > 0 && (
            <div className="loading-progress">
              <p>Registros cargados: {loadedCount}</p>
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${Math.min(100, (loadedCount / Math.max(recordCount, 1)) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AirtableIntegration;