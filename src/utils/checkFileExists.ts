import fs from "fs";

const checkFileExists = async (file: string) => {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
};

export default checkFileExists;
