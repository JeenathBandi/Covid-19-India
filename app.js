const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4001, () => {
      console.log("Server is running at http://localhost/4001");
    });
  } catch (e) {
    console.log(`DB error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertToObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertToObjectTo = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getDbQuery = `
        SELECT * FROM state;
    `;
  const dbArray = await db.all(getDbQuery);
  response.send(dbArray.map((eachArray) => convertToObject(eachArray)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getDbQuery = `
        SELECT * FROM state
        WHERE state_id = ${stateId};
    `;
  const dbResponse = await db.get(getDbQuery);
  response.send(convertToObject(dbResponse));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postDbQuery = `
        INSERT INTO 
            district(district_name,state_id,cases,cured,active,deaths)
        VALUES
            ('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}'); 
    `;
  await db.run(postDbQuery);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDbQuery = `
        SELECT * FROM district 
        WHERE district_id = ${districtId};
    `;
  const dbResponse = await db.get(getDbQuery);
  response.send(convertToObjectTo(dbResponse));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
        DELETE FROM district 
        WHERE district_id = ${districtId};
    `;
  await db.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateQuery = `
        UPDATE district
        SET district_name = '${districtName}',
            state_id = '${stateId}',
            cases = '${cases}',
            cured = '${cured}',
            active = '${active}',
            deaths = '${deaths}';
    `;
  await db.run(updateQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getDbQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM
            district
        WHERE 
            state_id = ${stateId};
    `;
  const stats = await db.get(getDbQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateIdQuery = `
        SELECT state_id FROM district
        WHERE district_id = ${districtId};
    `;
  const dbResponse = await db.get(getStateIdQuery);
  const getStateNameQuery = `
        SELECT state_name AS stateName
        FROM state
        WHERE state_id = ${dbResponse.state_id}; 
    
    `;
  const getFinalResponse = await db.get(getStateNameQuery);
  response.send(getFinalResponse);
});

module.exports = app;
