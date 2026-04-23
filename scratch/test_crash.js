try {
  const name = "";
  console.log(name?.[0].toUpperCase());
} catch (e) {
  console.log("CRASHED:", e.message);
}
