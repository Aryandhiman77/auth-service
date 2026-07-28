import fs from "fs/promises";
const unlinkFiles = async (files) => {
  if (!files) return;

  const paths = Array.isArray(files)
    ? files.map((file) => file?.path)
    : [files?.path];

  await Promise.allSettled(
    paths.filter(Boolean).map((path) => fs.unlink(path)),
  );
};

export default unlinkFiles;
