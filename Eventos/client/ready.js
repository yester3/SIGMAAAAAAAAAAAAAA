module.exports = {
  name: "ready",
  run: async (client) => {
    console.clear();
    console.log(`[Bot] ${client.user.tag} is online!`);
  },
};
