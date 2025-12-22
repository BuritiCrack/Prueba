import express from "express";
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
// Log al arrancar
console.log(`[BOOT] App starting... PID=${process.pid}`);
console.log(`[BOOT] Listening on port ${PORT}`);
// Log periódico para que veas en ACA que está viva
setInterval(() => {
    console.log(`[HEARTBEAT] App is running. Time=${new Date().toISOString()}`);
}, 10000);
app.get("/", (_req, res) => {
    console.log(`[REQ] GET /`);
    res.status(200).send("Hola Mundo desde Azure Container Apps 🚀");
});
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", time: new Date().toISOString() });
});
app.listen(PORT, "0.0.0.0");
