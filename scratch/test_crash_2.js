try {
  const category = "Fire";
  category?.map(c => console.log(c));
} catch (e) {
  console.log("CRASHED:", e.message);
}
