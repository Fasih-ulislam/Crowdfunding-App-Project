import app from "./app.js";
import testPostgres from "./config/testDB.js";
import { startCronJobs } from "./utils/cronJobs.js";
import dotenv from "dotenv";
dotenv.config();

//Start Server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server started at port ${process.env.PORT || 3000}...`);
});

testPostgres();
startCronJobs();