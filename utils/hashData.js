const bcrypt = require("bcryptjs");

const hashData = async (data, saltRound = 10) => {
  try {
    const hashedData = await bcrypt.hash(data, saltRound);
    return hashedData;
  } catch (error) {
    throw error;
  }
};

module.exports = hashData;
